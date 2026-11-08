using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Api.Application.Features.Auth;

public sealed class Login : IEndpoint
{
    public sealed record LoginResponse(
        string? Id,
        string? DisplayName,
        string? Email,
        string? UserName,
        string? Token,
        bool RequiresTwoFactor);

    public record AuthResponse(
        string Id,
        string DisplayName,
        string? Email,
        string? UserName,
        string Token);

    public sealed record Command(
        string Email,
        string Password,
        string? TwoFactorCode = null,
        string? RecoveryCode = null) : IRequest<Result<LoginResponse>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Invalid email format.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.");

            RuleFor(x => x.TwoFactorCode)
                .Matches("^\\d{6}$")
                .When(x => !string.IsNullOrWhiteSpace(x.TwoFactorCode));

            RuleFor(x => x.RecoveryCode)
                .Matches("^[A-Za-z0-9-]{6,20}$")
                .When(x => !string.IsNullOrWhiteSpace(x.RecoveryCode));

            RuleFor(x => x)
                .Must(x => string.IsNullOrWhiteSpace(x.TwoFactorCode) ||
                           string.IsNullOrWhiteSpace(x.RecoveryCode))
                .WithMessage("Provide either an authenticator code or a recovery code, not both.");
        }
    }

    public sealed class Handler(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IJwtGenerator jwtGenerator,
        IOptions<JwtSettings> jwtOptions,
        AppDbContext dbContext,
        IHttpContextAccessor contextAccessor) : IRequestHandler<Command, Result<LoginResponse>>
    {
        private readonly JwtSettings jwtSettings = jwtOptions.Value;
        public async Task<Result<LoginResponse>> Handle(Command request, CancellationToken cancellationToken)
        {
            var httpResponse = contextAccessor.HttpContext?.Response;

            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
                return Result<LoginResponse>.Failure(UserErrors.InvalidCredentials);

            if (!user.EmailConfirmed)
                return Result<LoginResponse>.Failure(UserErrors.EmailNotConfirmed);

            var signInResult = await signInManager.CheckPasswordSignInAsync(
                user,
                request.Password,
                lockoutOnFailure: true);

            if (signInResult.IsLockedOut)
                return Result<LoginResponse>.Failure(UserErrors.AccountLocked);

            if (!signInResult.Succeeded)
                return Result<LoginResponse>.Failure(UserErrors.InvalidCredentials);

            if (user.TwoFactorEnabled)
            {
                if (string.IsNullOrWhiteSpace(request.TwoFactorCode) &&
                    string.IsNullOrWhiteSpace(request.RecoveryCode))
                {
                    return Result<LoginResponse>.Success(
                        new LoginResponse(null, null, null, null, null, RequiresTwoFactor: true));
                }

                bool isValidCode;
                if (!string.IsNullOrWhiteSpace(request.RecoveryCode))
                {
                    var recoveryResult = await userManager.RedeemTwoFactorRecoveryCodeAsync(
                        user,
                        request.RecoveryCode.Trim());
                    isValidCode = recoveryResult.Succeeded;
                }
                else
                {
                    isValidCode = await userManager.VerifyTwoFactorTokenAsync(
                        user,
                        TokenOptions.DefaultAuthenticatorProvider,
                        request.TwoFactorCode!.Replace(" ", string.Empty, StringComparison.Ordinal));
                }

                if (!isValidCode)
                {
                    await userManager.AccessFailedAsync(user);
                    return Result<LoginResponse>.Failure(UserErrors.InvalidTwoFactorCode);
                }

                await userManager.ResetAccessFailedCountAsync(user);
            }

            var token = jwtGenerator.Generate(user);
            var refreshToken = RefreshTokenGenerator.GenerateToken();

            var hashed = RefreshTokenHasher.Hash(refreshToken);

            RefreshToken rfToken = new()
            {
                TokenHash = hashed,
                UserId = user.Id,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(jwtSettings.RefreshTokenExpirationInDays)
            };

            dbContext.RefreshTokens.Add(rfToken);

            await dbContext.SaveChangesAsync(cancellationToken);

            CookieHelper.SetRefreshTokenCookie(
                httpResponse!,
                refreshToken,
                rfToken.ExpiresAtUtc);

            var response = new LoginResponse(
                user.Id,
                user.DisplayName,
                user.Email,
                user.UserName,
                token,
                RequiresTwoFactor: false);

            return Result<LoginResponse>.Success(response);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/login", async (Command command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return result.ToResponse();
        })
        .WithName("Login")
        .WithTags("Auth")
        .Produces<LoginResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }

}
