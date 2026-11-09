using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class GetMessages : IEndpoint
{
    public sealed record Query(string ConversationId, DateTime? BeforeUtc, string? BeforeId, int? Limit)
        : IRequest<Result<IReadOnlyList<SendMessage.Response>>>;

    public sealed class Handler(AppDbContext dbContext, IUser currentUser)
        : IRequestHandler<Query, Result<IReadOnlyList<SendMessage.Response>>>
    {
        public async Task<Result<IReadOnlyList<SendMessage.Response>>> Handle(Query request, CancellationToken cancellationToken)
        {
            bool isParticipant = await dbContext.Participants.AsNoTracking().AnyAsync(
                item => item.ConversationId == request.ConversationId && item.UserId == currentUser.Id,
                cancellationToken);
            if (!isParticipant)
                return Result<IReadOnlyList<SendMessage.Response>>.Failure(MessagingErrors.NotConversationParticipant);

            int limit = Math.Clamp(request.Limit ?? 50, 1, 100);
            var query = dbContext.Messages.AsNoTracking().Where(item => item.ConversationId == request.ConversationId);
            if (request.BeforeUtc is not null && !string.IsNullOrWhiteSpace(request.BeforeId))
                query = query.Where(item => item.CreatedAtUtc < request.BeforeUtc ||
                    item.CreatedAtUtc == request.BeforeUtc && string.Compare(item.Id, request.BeforeId) < 0);

            var page = await query.OrderByDescending(item => item.CreatedAtUtc).ThenByDescending(item => item.Id)
                .Take(limit)
                .Select(item => new SendMessage.Response(
                    item.Id, item.ConversationId, item.SenderUserId, item.Sender.DisplayName,
                    item.Type, item.Text, item.ContentJson, item.ReplyToMessageId, item.IsPinned,
                    item.IsForwarded, item.CreatedAtUtc, item.EditedAtUtc, item.DeletedAtUtc,
                    item.Attachments.Select(file => new SendMessage.AttachmentResponse(file.Id, file.FileName,
                        file.ContentType, file.SizeBytes, file.Width, file.Height, file.DurationSeconds)).ToList(),
                    item.Reactions.Select(reaction => new SendMessage.ReactionResponse(reaction.UserId,
                        reaction.User.DisplayName, reaction.Emoji)).ToList(),
                    item.Receipts.Select(receipt => new SendMessage.ReceiptResponse(receipt.UserId,
                        receipt.User.DisplayName, receipt.DeliveredAtUtc, receipt.ReadAtUtc)).ToList()))
                .ToListAsync(cancellationToken);

            page.Reverse();
            return Result<IReadOnlyList<SendMessage.Response>>.Success(page);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("conversations/{conversationId}/messages", async (
            string conversationId, DateTime? beforeUtc, string? beforeId, int? limit,
            ISender sender, CancellationToken cancellationToken) =>
            (await sender.Send(new Query(conversationId, beforeUtc, beforeId, limit), cancellationToken)).ToResponse())
            .WithName("GetMessages").WithTags("Messages").Produces<IReadOnlyList<SendMessage.Response>>()
            .RequireAuthorization();
    }
}
