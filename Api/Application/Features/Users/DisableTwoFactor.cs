using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Users;

public sealed class DisableTwoFactor : IEndpoint
{
    public sealed record Command(string Password, string Code) : IRequest<Result>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Password).NotEmpty();
            RuleFor(request => request.Code).NotEmpty().Matches("^\\d{6}$");
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result.Failure(UserErrors.UserNotFound);
            if (!user.TwoFactorEnabled)
                return Result.Failure(UserErrors.TwoFactorNotEnabled);
            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return Result.Failure(UserErrors.InvalidPassword);

            bool validCode = await userManager.VerifyTwoFactorTokenAsync(
                user,
                TokenOptions.DefaultAuthenticatorProvider,
                request.Code);
            if (!validCode)
                return Result.Failure(UserErrors.InvalidAuthenticatorCode);

            IdentityResult disabled = await userManager.SetTwoFactorEnabledAsync(user, false);
            if (!disabled.Succeeded)
                return Result.Failure(Error.Validation(
                    "User.TWO_FACTOR_DISABLE_FAILED",
                    "Unable to disable two-factor authentication.",
                    AuthenticatorSetup.ToErrors(disabled)));

            IdentityResult resetKey = await userManager.ResetAuthenticatorKeyAsync(user);
            if (!resetKey.Succeeded)
                return Result.Failure(Error.Validation(
                    "User.AUTHENTICATOR_RESET_FAILED",
                    "Two-factor authentication was disabled, but the authenticator key could not be reset.",
                    AuthenticatorSetup.ToErrors(resetKey)));

            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/two-factor/disable", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse(StatusCodes.Status204NoContent))
            .WithName("DisableTwoFactor")
            .WithTags("Users")
            .RequireAuthorization()
            .RequireRateLimiting("AuthLimiter")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
