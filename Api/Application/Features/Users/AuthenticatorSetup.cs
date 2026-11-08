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

public sealed class AuthenticatorSetup : IEndpoint
{
    public sealed record Response(string SharedKey, string AuthenticatorUri);
    public sealed record Command(string Password) : IRequest<Result<Response>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Password).NotEmpty();
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager) : IRequestHandler<Command, Result<Response>>
    {
        public async Task<Result<Response>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result<Response>.Failure(UserErrors.UserNotFound);
            if (user.TwoFactorEnabled)
                return Result<Response>.Failure(UserErrors.TwoFactorAlreadyEnabled);
            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return Result<Response>.Failure(UserErrors.InvalidPassword);

            string? sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
            if (string.IsNullOrWhiteSpace(sharedKey))
            {
                IdentityResult resetResult = await userManager.ResetAuthenticatorKeyAsync(user);
                if (!resetResult.Succeeded)
                    return Result<Response>.Failure(UserErrors.ProfileUpdateFailed(ToErrors(resetResult)));

                sharedKey = await userManager.GetAuthenticatorKeyAsync(user);
            }

            if (string.IsNullOrWhiteSpace(sharedKey))
                return Result<Response>.Failure(Error.Failure("Unable to generate an authenticator key."));

            string email = Uri.EscapeDataString(user.Email ?? user.UserName ?? user.Id);
            string issuer = Uri.EscapeDataString("iMessage");
            string authenticatorUri =
                $"otpauth://totp/{issuer}:{email}?secret={sharedKey}&issuer={issuer}&digits=6";

            return Result<Response>.Success(new Response(sharedKey, authenticatorUri));
        }
    }

    internal static Dictionary<string, string[]> ToErrors(IdentityResult result) =>
        result.Errors.GroupBy(error => error.Code)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/two-factor/authenticator", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .WithName("GetAuthenticatorSetup")
            .WithTags("Users")
            .RequireAuthorization()
            .Produces<Response>(StatusCodes.Status200OK);
    }
}
