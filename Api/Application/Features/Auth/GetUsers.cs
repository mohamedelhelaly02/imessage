using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Auth;

public sealed class GetUsers : IEndpoint
{
    public sealed record Response(
        string Id,
        string DisplayName,
        string? UserName,
        string? Email,
        string? PictureUrl,
        DateTime? LastSeenAtUtc);

    public sealed record Query : IRequest<Result<IReadOnlyList<Response>>>;

    public sealed class Handler(AppDbContext dbContext) : IRequestHandler<Query, Result<IReadOnlyList<Response>>>
    {
        public async Task<Result<IReadOnlyList<Response>>> Handle(
            Query request,
            CancellationToken cancellationToken)
        {
            var users = await dbContext.Users
                .AsNoTracking()
                .Select(user => new Response(
                    user.Id,
                    user.DisplayName,
                    user.UserName,
                    user.Email,
                    user.ProfilePictureUrl,
                    user.LastSeenAtUtc))
                .ToListAsync(cancellationToken);
            return Result<IReadOnlyList<Response>>.Success(users);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("users", async (ISender sender) => (await sender.Send(new Query())).ToResponse())
            .WithName("GetUsers")
            .WithTags("Users")
            .Produces<IReadOnlyList<Response>>(StatusCodes.Status200OK)
            .RequireAuthorization(options => options.RequireAuthenticatedUser());

    }

}
