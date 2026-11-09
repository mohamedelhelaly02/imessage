using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class SearchMessages : IEndpoint
{
    public sealed record Query(string ConversationId, string SearchTerm, int? Limit)
        : IRequest<Result<IReadOnlyList<SearchResult>>>;
    public sealed record SearchResult(string Id, string SenderUserId, string SenderDisplayName,
        string? Text, DateTime CreatedAtUtc, bool IsForwarded);
    public sealed class Validator : AbstractValidator<Query>
    {
        public Validator()
        {
            RuleFor(item => item.ConversationId).NotEmpty();
            RuleFor(item => item.SearchTerm).NotEmpty().MaximumLength(100);
        }
    }

    public sealed class Handler(AppDbContext db, IUser user) : IRequestHandler<Query, Result<IReadOnlyList<SearchResult>>>
    {
        public async Task<Result<IReadOnlyList<SearchResult>>> Handle(Query request, CancellationToken token)
        {
            bool participant = await db.Participants.AnyAsync(item => item.ConversationId == request.ConversationId &&
                item.UserId == user.Id, token);
            if (!participant) return Result<IReadOnlyList<SearchResult>>.Failure(MessagingErrors.NotConversationParticipant);

            int limit = Math.Clamp(request.Limit ?? 50, 1, 100);
            var results = await db.Messages.AsNoTracking()
                .Where(item => item.ConversationId == request.ConversationId && item.DeletedAtUtc == null &&
                    item.Text != null && item.Text.Contains(request.SearchTerm))
                .OrderByDescending(item => item.CreatedAtUtc)
                .Take(limit)
                .Select(item => new SearchResult(item.Id, item.SenderUserId, item.Sender.DisplayName,
                    item.Text, item.CreatedAtUtc, item.IsForwarded))
                .ToListAsync(token);
            return Result<IReadOnlyList<SearchResult>>.Success(results);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("conversations/{conversationId}/messages/search", async (
            string conversationId, string term, int? limit, ISender sender, CancellationToken token) =>
            (await sender.Send(new Query(conversationId, term, limit), token)).ToResponse())
            .WithName("SearchMessages").WithTags("Messages").RequireAuthorization();
    }
}
