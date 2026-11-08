using Api.Domain.Entities;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Auth;

public sealed class Logout : IEndpoint
{
    public sealed record Command : IRequest<Result>;

    public sealed class Handler(
        AppDbContext dbContext,
        IHttpContextAccessor contextAccessor) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            string? refreshCookie = CookieHelper.GetRefreshTokenCookie(contextAccessor.HttpContext?.Request!);
            if (!string.IsNullOrEmpty(refreshCookie))
            {
                string tokenHash = RefreshTokenHasher.Hash(refreshCookie);
                RefreshToken? existingToken = await dbContext.RefreshTokens
                    .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, cancellationToken);

                if (existingToken is not null && existingToken.RevokedAtUtc is null)
                {
                    await dbContext.RefreshTokens
                        .Where(r => r.FamilyId == existingToken.FamilyId && r.RevokedAtUtc == null)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(r => r.RevokedAtUtc, DateTime.UtcNow)
                            .SetProperty(r => r.IsUsed, true), cancellationToken);

                    await dbContext.Users
                        .Where(u => u.Id == existingToken.UserId)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(u => u.LastSeenAtUtc, DateTime.UtcNow), cancellationToken);
                }
            }

            CookieHelper.DeleteRefreshTokenCookie(contextAccessor.HttpContext?.Response!);

            return Result.Success();
        }
    }


    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/logout", async (ISender sender) =>
        {
            Result logoutResult = await sender.Send(new Command());

            return logoutResult.ToResponse(StatusCodes.Status204NoContent);
        })
            .AllowAnonymous()
            .WithName("Logout")
            .WithTags("Auth")
            .Produces(StatusCodes.Status204NoContent)
            .RequireRateLimiting("AuthLimiter");
    }

}
