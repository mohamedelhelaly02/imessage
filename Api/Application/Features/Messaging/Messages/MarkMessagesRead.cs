using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class MarkMessagesRead : IEndpoint
{
    public sealed record Command(string ConversationId, List<string> MessageIds) : IRequest<Result>;
    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(item => item.ConversationId).NotEmpty();
            RuleFor(item => item.MessageIds).NotNull().NotEmpty().Must(ids => ids.Count <= 100)
                .Must(ids => ids.Distinct(StringComparer.Ordinal).Count() == ids.Count);
        }
    }

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier)
        : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken token)
        {
            bool participant = await db.Participants.AnyAsync(item => item.ConversationId == request.ConversationId &&
                item.UserId == user.Id, token);
            if (!participant) return Result.Failure(MessagingErrors.NotConversationParticipant);

            var receipts = await db.MessageReceipts
                .Where(item => request.MessageIds.Contains(item.MessageId) && item.UserId == user.Id &&
                    item.Message.ConversationId == request.ConversationId)
                .ToListAsync(token);
            if (receipts.Count != request.MessageIds.Count)
                return Result.Failure(MessagingErrors.MessageNotFound);

            var now = DateTime.UtcNow;
            foreach (var receipt in receipts)
            {
                receipt.DeliveredAtUtc ??= now;
                receipt.ReadAtUtc ??= now;
            }
            await db.SaveChangesAsync(token);
            await notifier.NotifyMessageChangedAsync(request.ConversationId, "MessageReceiptsUpdated",
                new { UserId = user.Id, MessageIds = request.MessageIds, DeliveredAtUtc = now, ReadAtUtc = now }, token);
            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("conversations/{conversationId}/messages/read", async (
            string conversationId, Body body, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(conversationId, body.MessageIds), token)).ToResponse())
            .WithName("MarkMessagesRead").WithTags("Messages").RequireAuthorization();
    }
    public sealed record Body(List<string> MessageIds);
}
