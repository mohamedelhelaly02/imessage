using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Auth.Email;

internal sealed class VerifyEmailOtp : IEndpoint
{
    public sealed record Command(string Email, string Code) : IRequest<Result<string>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().EmailAddress();

            RuleFor(x => x.Code)
                .NotEmpty()
                .Matches("^\\d{6}$")
                .WithMessage("The verification code must be 6 digits.");
        }
    }

    public sealed class Handler(
        UserManager<User> userManager,
        IEmailOtpService emailOtpService) : IRequestHandler<Command, Result<string>>
    {
        public async Task<Result<string>> Handle(Command request, CancellationToken cancellationToken)
        {
            var user = await userManager.FindByEmailAsync(request.Email);

            if (user is null)
                return Result<string>.Failure(UserErrors.InvalidEmailConfirmationOtp);

            if (user.EmailConfirmed)
                return Result<string>.Success("Email is already confirmed.");

            var result = await emailOtpService.VerifyAndConfirmEmailAsync(
                user.Id,
                request.Code,
                cancellationToken);

            if (!result.IsSuccess)
                return Result<string>.Failure(result.Error!);

            return Result<string>.Success("Email confirmed successfully. You can now log in.");
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/verify-otp", async (Command command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return result.ToResponse();
        })
        .AllowAnonymous()
        .WithName("VerifyEmailOtp")
        .WithTags("Auth")
        .Produces<string>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
