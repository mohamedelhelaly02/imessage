using System.Buffers.Text;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Api.Infrastructure.Persistence;
using Api.Shared.Helpers;
using Api.Domain.Entities;
using Api.Shared.Extensions;
using Api.Shared.Abstraction;

namespace Api.Application.Features.Auth;

public sealed class ResetPassword : IEndpoint
{
    public sealed record Command(string Email, string Token, string NewPassword) : IRequest<Result>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Email).NotEmpty();
            RuleFor(request => request.Token).NotEmpty();
            RuleFor(request => request.NewPassword)
                .NotEmpty()
                .Matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$")
                .WithMessage("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character.");
        }
    }

    public sealed class Handler(
        UserManager<User> userManager,
        AppDbContext dbContext) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            string email;
            string token;
            try
            {
                email = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(request.Email));
                token = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(request.Token));
            }
            catch (FormatException)
            {
                return Result.Failure(UserErrors.InvalidPasswordResetToken);
            }

            User? user = await userManager.FindByEmailAsync(email);
            if (user is null)
                return Result.Failure(UserErrors.InvalidPasswordResetToken);

            IdentityResult result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!result.Succeeded)
            {
                Dictionary<string, string[]> errors = result.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

                return Result.Failure(UserErrors.PasswordResetFailed(errors));
            }

            await dbContext.RefreshTokens
                .Where(refreshToken => refreshToken.UserId == user.Id && refreshToken.RevokedAtUtc == null)
                .ExecuteUpdateAsync(update => update
                    .SetProperty(refreshToken => refreshToken.RevokedAtUtc, DateTime.UtcNow)
                    .SetProperty(refreshToken => refreshToken.IsUsed, true), cancellationToken);

            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/reset-password", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .AllowAnonymous()
            .WithName("ResetPassword")
            .WithTags("Auth")
            .Produces(StatusCodes.Status200OK)
            .RequireRateLimiting("AuthLimiter");
    }
}
