using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Users;

public sealed class GetProfile : IEndpoint
{
    public sealed record Response(
        string Id,
        string DisplayName,
        string? UserName,
        string? Email,
        string? ProfilePictureUrl,
        DateTime? LastSeenAtUtc,
        bool TwoFactorEnabled,
        int RecoveryCodesLeft);

    public sealed record Query : IRequest<Result<Response>>;

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager) : IRequestHandler<Query, Result<Response>>
    {
        public async Task<Result<Response>> Handle(Query request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result<Response>.Failure(UserErrors.UserNotFound);

            int recoveryCodesLeft = await userManager.CountRecoveryCodesAsync(user);
            return Result<Response>.Success(new Response(
                user.Id,
                user.DisplayName,
                user.UserName,
                user.Email,
                user.ProfilePictureUrl,
                user.LastSeenAtUtc,
                user.TwoFactorEnabled,
                recoveryCodesLeft));
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("users/me", async (ISender sender) => (await sender.Send(new Query())).ToResponse())
            .WithName("GetMyProfile")
            .WithTags("Users")
            .RequireAuthorization()
            .Produces<Response>(StatusCodes.Status200OK);
    }
}
