using Amazon.Runtime;
using Amazon.S3;
using Api.Application.Behaviors;
using Api.Application.Features.Auth.Email;
using Api.Application.Hubs;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.External;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Messaging;
using Api.Infrastructure.Persistence;
using Api.Infrastructure.Storage;
using Api.Shared;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using Api.Shared.OpenApi;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<JwtBearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<JwtBearerSecurityRequirementTransformer>();
});

builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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

builder.Services
    .AddOptions<ObjectStorageSettings>()
    .Bind(builder.Configuration.GetSection(ObjectStorageSettings.SectionName))
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.Endpoint),
        "Object Storage Endpoint is required.")
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.AccessKey),
        "Object Storage AccessKey is required.")
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.SecretKey),
        "Object Storage SecretKey is required.")
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.AttachmentsBucket),
        "Attachments Bucket is required.")
    .ValidateOnStart();

builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var options = sp.GetRequiredService<IOptions<ObjectStorageSettings>>()
        .Value;

    var credentials = new BasicAWSCredentials(
        options.AccessKey,
        options.SecretKey);

    var config = new AmazonS3Config
    {
        ServiceURL = options.Endpoint,
        ForcePathStyle = true,
        AuthenticationRegion = options.Region
    };

    return new AmazonS3Client(credentials, config);
});

builder.Services.AddScoped<IObjectStorage, S3ObjectStorage>();

builder.Services.AddScoped<IMessageNotifier, SignalRMessageNotifier>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));

builder.Services.AddTransient<IEmailService, EmailService>();
builder.Services.AddTransient<IEmailLinkGenerator, EmailLinkGenerator>();

builder.Services.AddScoped<IEmailOtpService, EmailOtpService>();
builder.Services.AddScoped<IEmailConfirmationStrategy, WebEmailConfirmationStrategy>();
builder.Services.AddScoped<IEmailConfirmationStrategy, MobileEmailConfirmationStrategy>();
builder.Services.AddScoped<IEmailConfirmationStrategyResolver, EmailConfirmationStrategyResolver>();

builder.Services.AddOptions<OtpSettings>()
    .Bind(builder.Configuration.GetSection(OtpSettings.SectionName))
    .Validate(options => options.OtpLength == 6, "Otp length must be of 6 digits.")
    .Validate(options => !string.IsNullOrEmpty(options.Secret), "Secret key is required.")
    .Validate(options => options.MaxFailedAttempts > 0, "MaxFailedAttempts must be a greater than zero.")
    .Validate(options => options.ExpirationMinutes > 0, "ExpirationMinutes must be a greater than zero.")
    .ValidateOnStart();

WebApplication app = builder.Build();

//await DbInitializer.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Api v1"));
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
