using Api.Application.Behaviors;
using Api.Application.Hubs;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure;
using Api.Infrastructure.External;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Persistence;
using Api.Infrastructure.Persistence.Seed;
using Api.Shared;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"), c => c.EnableRetryOnFailure()));

builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
})
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddProblemDetails();

JwtSettings jwtSettings = builder.Configuration
    .GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>() ?? throw new InvalidOperationException("JwtSettings is missing in configuration.");

builder.Services.AddSingleton(jwtSettings);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.SaveToken = true;
        options.TokenValidationParameters = new()
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];

                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        var clientUrl = builder.Configuration["AngularClient"];

        if (string.IsNullOrEmpty(clientUrl))
            throw new InvalidOperationException(nameof(clientUrl));

        policy.WithOrigins(clientUrl)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});

builder.Services.AddScoped<IJwtGenerator, JwtGenerator>();

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));

builder.Services.AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection(JwtSettings.SectionName))
    .Validate(settings =>
    {
        return !string.IsNullOrWhiteSpace(settings.Secret) &&
               !string.IsNullOrWhiteSpace(settings.Issuer) &&
               !string.IsNullOrWhiteSpace(settings.Audience) &&
               settings.ExpirationInMinutes > 0 &&
               settings.RefreshTokenExpirationInDays > 0;
    }, "Invalid JWT configuration.")
    .ValidateOnStart();

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IUser, CurrentUser>();

builder.Services.AddEndpoints();

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSignalR();

builder.Services.AddSingleton<IConnectionTracker, ConnectionTracker>();

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("AuthLimiter", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }
        ));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var problem = new ProblemDetails()
        {
            Status = StatusCodes.Status429TooManyRequests,
            Detail = "You have sent too many requests in a short time. Please try again later.",
            Title = "Many Requests"
        };

        await context.HttpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
    };
});

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));

builder.Services.AddTransient<IEmailService, EmailService>();
builder.Services.AddTransient<IEmailLinkGenerator, EmailLinkGenerator>();

WebApplication app = builder.Build();

await DbInitializer.SeedAsync(app.Services);

app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();

app.UseHttpsRedirection();

app.UseCors("AllowAngularApp");

app.UseAuthentication();

app.UseAuthorization();

RouteGroupBuilder group = app.MapGroup("api/");

app.MapEndpoints(group);

app.MapHub<ChatHub>("/hubs/chat");

app.Run();