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
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Users;

public sealed class ChangePassword : IEndpoint
{
    public sealed record Command(
        string CurrentPassword,
        string NewPassword,
        string? TwoFactorCode) : IRequest<Result>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.CurrentPassword).NotEmpty();
            RuleFor(request => request.TwoFactorCode)
                .Matches("^\\d{6}$")
                .When(request => !string.IsNullOrWhiteSpace(request.TwoFactorCode));
            RuleFor(request => request.NewPassword)
                .NotEmpty()
                .Matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$")
                .WithMessage("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character.");
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager,
        AppDbContext dbContext,
        IHttpContextAccessor httpContextAccessor) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result.Failure(UserErrors.UserNotFound);

            if (!await userManager.CheckPasswordAsync(user, request.CurrentPassword))
                return Result.Failure(UserErrors.InvalidPassword);

            if (user.TwoFactorEnabled)
            {
                bool validCode = await userManager.VerifyTwoFactorTokenAsync(
                    user,
                    TokenOptions.DefaultAuthenticatorProvider,
                    request.TwoFactorCode ?? string.Empty);
                if (!validCode)
                    return Result.Failure(UserErrors.InvalidAuthenticatorCode);
            }

            IdentityResult result = await userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword,
                request.NewPassword);
            if (!result.Succeeded)
            {
                Dictionary<string, string[]> errors = result.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
                return Result.Failure(UserErrors.PasswordChangeFailed(errors));
            }

            await RefreshSessionRevoker.RevokeOtherSessionsAsync(
                dbContext,
                user,
                httpContextAccessor.HttpContext!.Request,
                cancellationToken);

            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/password", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse(StatusCodes.Status204NoContent))
            .WithName("ChangeMyPassword")
            .WithTags("Users")
            .RequireAuthorization()
            .RequireRateLimiting("AuthLimiter")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
