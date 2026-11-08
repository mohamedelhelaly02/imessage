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

public sealed class UpdateProfile : IEndpoint
{
    public sealed record Command(
        string DisplayName,
        string? UserName,
        string? ProfilePictureUrl) : IRequest<Result<GetProfile.Response>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.DisplayName)
                .NotEmpty()
                .Must(displayName => !string.IsNullOrWhiteSpace(displayName))
                .MaximumLength(100);
            RuleFor(request => request.UserName)
                .MaximumLength(50)
                .When(request => !string.IsNullOrWhiteSpace(request.UserName));
            RuleFor(request => request.ProfilePictureUrl)
                .MaximumLength(2048)
                .When(request => !string.IsNullOrWhiteSpace(request.ProfilePictureUrl));
            RuleFor(request => request.ProfilePictureUrl)
                .Must(value => string.IsNullOrWhiteSpace(value) ||
                               Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) &&
                               uri.Scheme == Uri.UriSchemeHttps)
                .WithMessage("Profile picture URL must be a valid HTTPS URL.");
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager) : IRequestHandler<Command, Result<GetProfile.Response>>
    {
        public async Task<Result<GetProfile.Response>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result<GetProfile.Response>.Failure(UserErrors.UserNotFound);

            string? requestedUserName = string.IsNullOrWhiteSpace(request.UserName)
                ? user.UserName
                : request.UserName.Trim();

            if (!string.Equals(user.UserName, requestedUserName, StringComparison.Ordinal))
            {
                user.UserName = requestedUserName;
                user.NormalizedUserName = userManager.NormalizeName(requestedUserName);
            }

            user.DisplayName = request.DisplayName.Trim();
            user.ProfilePictureUrl = string.IsNullOrWhiteSpace(request.ProfilePictureUrl)
                ? null
                : request.ProfilePictureUrl.Trim();

            IdentityResult updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
                return Result<GetProfile.Response>.Failure(ToIdentityError(updateResult));

            return Result<GetProfile.Response>.Success(new GetProfile.Response(
                user.Id,
                user.DisplayName,
                user.UserName,
                user.Email,
                user.ProfilePictureUrl,
                user.LastSeenAtUtc,
                user.TwoFactorEnabled,
                await userManager.CountRecoveryCodesAsync(user)));
        }
    }

    private static Error ToIdentityError(IdentityResult result)
    {
        Dictionary<string, string[]> errors = result.Errors
            .GroupBy(error => error.Code)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
        return UserErrors.ProfileUpdateFailed(errors);
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("users/me", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .WithName("UpdateMyProfile")
            .WithTags("Users")
            .RequireAuthorization()
            .Produces<GetProfile.Response>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
