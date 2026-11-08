using Api.Domain.Entities;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Persistence;
using Api.Shared.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Users;

internal static class RefreshSessionRevoker
{
    public static async Task RevokeOtherSessionsAsync(
        AppDbContext dbContext,
        User user,
        HttpRequest request,
        CancellationToken cancellationToken)
    {
        string? rawRefreshToken = CookieHelper.GetRefreshTokenCookie(request);
        string? currentFamilyId = null;
        if (!string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            string tokenHash = RefreshTokenHasher.Hash(rawRefreshToken);
            currentFamilyId = await dbContext.RefreshTokens
                .Where(token => token.UserId == user.Id && token.TokenHash == tokenHash)
                .Select(token => token.FamilyId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        IQueryable<RefreshToken> refreshTokens = dbContext.RefreshTokens
            .Where(token => token.UserId == user.Id && token.RevokedAtUtc == null);
        if (currentFamilyId is not null)
            refreshTokens = refreshTokens.Where(token => token.FamilyId != currentFamilyId);

        await refreshTokens
            .ExecuteUpdateAsync(update => update
                .SetProperty(token => token.RevokedAtUtc, DateTime.UtcNow)
                .SetProperty(token => token.IsUsed, true), cancellationToken);
    }
}
