using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Users;

public sealed class EnableTwoFactor : IEndpoint
{
    public sealed record Command(string Code) : IRequest<Result<IReadOnlyList<string>>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Code).NotEmpty().Matches("^\\d{6}$");
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager,
        AppDbContext dbContext,
        IHttpContextAccessor httpContextAccessor) : IRequestHandler<Command, Result<IReadOnlyList<string>>>
    {
        public async Task<Result<IReadOnlyList<string>>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result<IReadOnlyList<string>>.Failure(UserErrors.UserNotFound);
            if (user.TwoFactorEnabled)
                return Result<IReadOnlyList<string>>.Failure(UserErrors.TwoFactorAlreadyEnabled);

            bool validCode = await userManager.VerifyTwoFactorTokenAsync(
                user,
                TokenOptions.DefaultAuthenticatorProvider,
                request.Code);
            if (!validCode)
                return Result<IReadOnlyList<string>>.Failure(UserErrors.InvalidAuthenticatorCode);

            IdentityResult enabled = await userManager.SetTwoFactorEnabledAsync(user, true);
            if (!enabled.Succeeded)
            {
                return Result<IReadOnlyList<string>>.Failure(
                    Error.Validation("User.TWO_FACTOR_ENABLE_FAILED", "Unable to enable two-factor authentication.", AuthenticatorSetup.ToErrors(enabled)));
            }

            IEnumerable<string>? recoveryCodes = await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
            if (recoveryCodes is null)
            {
                await userManager.SetTwoFactorEnabledAsync(user, false);
                return Result<IReadOnlyList<string>>.Failure(
                    Error.Failure("Unable to generate two-factor recovery codes."));
            }

            await RefreshSessionRevoker.RevokeOtherSessionsAsync(
                dbContext,
                user,
                httpContextAccessor.HttpContext!.Request,
                cancellationToken);

            return Result<IReadOnlyList<string>>.Success([.. recoveryCodes]);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/two-factor/enable", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .WithName("EnableTwoFactor")
            .WithTags("Users")
            .RequireAuthorization()
            .RequireRateLimiting("AuthLimiter")
            .Produces<IReadOnlyList<string>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
