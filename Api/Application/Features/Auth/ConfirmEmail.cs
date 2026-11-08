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

public sealed class ConfirmEmail : IEndpoint
{
    public sealed record Command(string Email, string Token) : IRequest<Result<string>>;

    public sealed class Handler(
        ILogger<Handler> logger,
       UserManager<User> userManager,
       IEmailService emailService) : IRequestHandler<Command, Result<string>>
    {
        public async Task<Result<string>> Handle(Command request, CancellationToken cancellationToken)
        {
            var decodedEmail = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(request.Email));

            User? existingUser = await userManager.FindByEmailAsync(decodedEmail);

            if (existingUser is null)
                return Result<string>.Failure(UserErrors.InvalidCredentials);

            var decodedToken = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(request.Token));

            IdentityResult result = await userManager.ConfirmEmailAsync(existingUser, decodedToken);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();

                logger.LogError("Email confirmation failed: {error}", string.Join(", ", errors));
                return Result<string>.Failure(UserErrors.EmailNotConfirmed);
            }

            await emailService.SendEmailAsync(existingUser.Email!, "Email confirmation success", "<p>Email validation successful! You can now log in.</p>");

            return Result<string>.Success("Email validation successful! You can now log in.");
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/confirm-email", async (Command command, ISender sender) =>
        {
            Result<string> result = await sender.Send(command);
            return result.ToResponse();
        })
            .AllowAnonymous()
            .WithName("ConfirmEmail")
            .WithTags("Auth")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}