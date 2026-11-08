using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Identity;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Application.Features.Auth;

public sealed class Refresh : IEndpoint
{
    public sealed record Command : IRequest<Result<Login.AuthResponse>>;

    public sealed class Handler(
        IJwtGenerator jwtGenerator,
        IOptions<JwtSettings> jwtOptions,
        AppDbContext dbContext,
        ILogger<Handler> logger,
        IHttpContextAccessor contextAccessor) : IRequestHandler<Command, Result<Login.AuthResponse>>
    {
        private readonly JwtSettings jwtSettings = jwtOptions.Value;

        public async Task<Result<Login.AuthResponse>> Handle(Command request, CancellationToken cancellationToken)
        {
            string? cookieRefresh = CookieHelper.GetRefreshTokenCookie(contextAccessor.HttpContext!.Request);

            if (string.IsNullOrEmpty(cookieRefresh))
            {
                logger.LogWarning("Cookie is missing");
                return Result<Login.AuthResponse>.Failure(Error.Unauthorized());
            }
            string hashed = RefreshTokenHasher.Hash(cookieRefresh);

            RefreshToken? existedRefresh = await dbContext.RefreshTokens
                .AsNoTracking()
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.TokenHash == hashed, cancellationToken);

            if (existedRefresh is null)
            {
                logger.LogWarning("Token is missing in db.");
                return Result<Login.AuthResponse>.Failure(Error.Unauthorized());
            }

            // If the token has already been used/revoked, it indicates token theft/replay attack.
            // Revoke the entire family chain.

            if (existedRefresh.IsUsed || existedRefresh.RevokedAtUtc is not null)
            {
                await dbContext.RefreshTokens
                    .Where(r => r.FamilyId == existedRefresh.FamilyId && r.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(r => r.RevokedAtUtc, DateTime.UtcNow)
                        .SetProperty(r => r.IsUsed, true), cancellationToken);

                CookieHelper.DeleteRefreshTokenCookie(contextAccessor.HttpContext.Response);

                logger.LogInformation("Token is re-used");

                return Result<Login.AuthResponse>.Failure(Error.Unauthorized());
            }

            if (existedRefresh.IsExpired || existedRefresh.User is null)
            {
                logger.LogInformation("Token expired.");
                return Result<Login.AuthResponse>.Failure(Error.Unauthorized());
            }

            existedRefresh.IsUsed = true;
            existedRefresh.RevokedAtUtc = DateTime.UtcNow;

            string newRawRefreshToken = RefreshTokenGenerator.GenerateToken();
            string newHashedToken = RefreshTokenHasher.Hash(newRawRefreshToken);

            var newRefreshToken = new RefreshToken
            {
                UserId = existedRefresh.UserId,
                TokenHash = newHashedToken,
                FamilyId = existedRefresh.FamilyId, // Preserve family
                ExpiresAtUtc = DateTime.UtcNow.AddDays(jwtSettings.RefreshTokenExpirationInDays)
            };

            dbContext.RefreshTokens.Add(newRefreshToken);
            existedRefresh.ReplacedByTokenId = newRefreshToken.Id;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await dbContext.RefreshTokens
                    .Where(r => r.FamilyId == existedRefresh.FamilyId && r.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(r => r.RevokedAtUtc, DateTime.UtcNow)
                        .SetProperty(r => r.IsUsed, true), cancellationToken);

                CookieHelper.DeleteRefreshTokenCookie(contextAccessor.HttpContext.Response);
                return Result<Login.AuthResponse>.Failure(Error.Unauthorized());
            }

            string newAccessToken = jwtGenerator.Generate(existedRefresh.User);

            CookieHelper.SetRefreshTokenCookie(
                contextAccessor.HttpContext.Response,
                newRawRefreshToken,
                newRefreshToken.ExpiresAtUtc);

            return Result<Login.AuthResponse>.Success(
                new Login.AuthResponse(
                    existedRefresh.User.Id,
                    existedRefresh.User.DisplayName,
                    existedRefresh.User.Email,
                    existedRefresh.User.UserName,
                    newAccessToken
                ));

        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/refresh", async (ISender sender) =>
        {
            Result<Login.AuthResponse> authResult = await sender.Send(new Command());
            return authResult.ToResponse();
        })
            .AllowAnonymous()
            .WithName("Refresh")
            .WithTags("Auth")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .Produces<Login.AuthResponse>(StatusCodes.Status200OK);
    }
}
