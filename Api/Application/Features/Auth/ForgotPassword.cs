using System.Buffers.Text;
using System.Text;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Auth;

public sealed class ForgotPassword : IEndpoint
{
    public sealed record Command(string Email) : IRequest<Result<string>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Email).NotEmpty().EmailAddress();
        }
    }

    public sealed class Handler(
        UserManager<User> userManager,
        IEmailLinkGenerator linkGenerator,
        IEmailService emailService) : IRequestHandler<Command, Result<string>>
    {
        public async Task<Result<string>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByEmailAsync(request.Email);
            if (user?.EmailConfirmed is true)
            {
                string token = await userManager.GeneratePasswordResetTokenAsync(user);
                string encodedEmail = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(user.Email!));
                string encodedToken = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(token));
                string resetLink = linkGenerator.GenerateResetPasswordLink(encodedEmail, encodedToken);

                await emailService.SendEmailAsync(
                    user.Email!,
                    "Reset your password",
                    $"<p>Use the following link to reset your password:</p><p><a href=\"{resetLink}\">Reset password</a></p>");
            }

            return Result<string>.Success(
                "If an account with that email exists, a password reset link has been sent.");
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/forgot-password", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .AllowAnonymous()
            .WithName("ForgotPassword")
            .WithTags("Auth")
            .Produces<string>(StatusCodes.Status200OK)
            .RequireRateLimiting("AuthLimiter");
    }
}
