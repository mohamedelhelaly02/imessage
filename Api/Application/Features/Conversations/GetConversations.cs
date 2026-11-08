using Api.Application.Interfaces;
using Api.Domain.Enums;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Conversations;

public sealed class GetConversations : IEndpoint
{
    public sealed record ParticipantDto(
        string UserId,
        string DisplayName,
        ParticipantRole Role,
        string? PictureUrl,
        DateTime? LastSeenAtUtc);

    public sealed record Response(
        string Id,
        string PublicId,
        ConversationType ConversationType,
        string? Title,
        string CreatedByUserId,
        DateTime CreatedAtUtc,
        DateTime? LastMessageAtUtc,
        List<ParticipantDto> Participants);

    public sealed record Query : IRequest<Result<IReadOnlyList<Response>>>;

    public sealed class Handler(
        AppDbContext dbContext,
        IUser user) : IRequestHandler<Query, Result<IReadOnlyList<Response>>>
    {
        public async Task<Result<IReadOnlyList<Response>>> Handle(
            Query request,
            CancellationToken cancellationToken)
        {
            string currentUserId = user.Id;

            IReadOnlyList<Response> conversations = await dbContext.Conversations
                .AsNoTracking()
                .Include(c => c.Participants)
                .ThenInclude(p => p.User)
                .Where(c => c.CreatedById == currentUserId || c.Participants.Any(p => p.UserId == currentUserId))
                .Select(c => new Response(
                    c.Id,
                    c.PublicId,
                    c.Type,
                    c.Title,
                    c.CreatedById,
                    c.CreatedAtUtc,
                    c.LastMessageAtUtc,
                    c.Participants.Select(p =>
                        new ParticipantDto(
                            p.UserId,
                            p.User.DisplayName,
                            p.Role,
                            p.User.ProfilePictureUrl,
                            p.User.LastSeenAtUtc)).ToList()))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<Response>>.Success(conversations);
        }

    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("conversations", async (ISender sender) =>
        {
            Result<IReadOnlyList<Response>> result = await sender.Send(new Query());

            return result.ToResponse();
        })
            .WithName("GetConversations")
            .WithTags("Conversations")
            .Produces<IReadOnlyList<Response>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .RequireAuthorization(options => options.RequireAuthenticatedUser());
    }
}
