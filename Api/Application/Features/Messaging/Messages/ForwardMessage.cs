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

public sealed class ForwardMessage : IEndpoint
{
    public sealed record Command(string MessageId, string TargetConversationId) : IRequest<Result<SendMessage.Response>>;
    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(item => item.MessageId).NotEmpty();
            RuleFor(item => item.TargetConversationId).NotEmpty();
        }
    }

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier)
        : IRequestHandler<Command, Result<SendMessage.Response>>
    {
        public async Task<Result<SendMessage.Response>> Handle(Command request, CancellationToken token)
        {
            var source = await db.Messages.Include(item => item.Attachments)
                .FirstOrDefaultAsync(item => item.Id == request.MessageId && item.DeletedAtUtc == null, token);
            if (source is null) return Result<SendMessage.Response>.Failure(MessagingErrors.MessageNotFound);

            bool sourceAccess = await db.Participants.AnyAsync(item => item.ConversationId == source.ConversationId &&
                item.UserId == user.Id, token);
            bool targetAccess = await db.Participants.AnyAsync(item => item.ConversationId == request.TargetConversationId &&
                item.UserId == user.Id, token);
            if (!sourceAccess || !targetAccess)
                return Result<SendMessage.Response>.Failure(MessagingErrors.NotConversationParticipant);

            var now = DateTime.UtcNow;
            var forwarded = new Message
            {
                ConversationId = request.TargetConversationId,
                SenderUserId = user.Id,
                ClientMessageId = Guid.NewGuid(),
                Type = source.Type,
                Text = source.Text,
                ContentJson = source.ContentJson,
                IsForwarded = true,
                CreatedAtUtc = now,
                Attachments = [.. source.Attachments.Select(file => new MessageAttachment
                {
                    ObjectKey = file.ObjectKey, FileName = file.FileName, ContentType = file.ContentType,
                    SizeBytes = file.SizeBytes, Width = file.Width, Height = file.Height,
                    DurationSeconds = file.DurationSeconds, CreatedAtUtc = now
                })]
            };
            var recipientIds = await db.Participants.Where(item => item.ConversationId == request.TargetConversationId &&
                item.UserId != user.Id).Select(item => item.UserId).ToListAsync(token);
            forwarded.Receipts = recipientIds.Select(id => new MessageReceipt { UserId = id }).ToList();
            db.Messages.Add(forwarded);
            var target = await db.Conversations.FirstAsync(item => item.Id == request.TargetConversationId, token);
            target.LastMessageAtUtc = now;
            await db.SaveChangesAsync(token);

            var response = await SendMessage.Handler.LoadResponseAsync(db, forwarded.Id, token);
            await notifier.NotifyMessageCreatedAsync(target.Id, response!, token);
            return Result<SendMessage.Response>.Success(response!);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("messages/{messageId}/forward", async (
            string messageId, Body body, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(messageId, body.TargetConversationId), token)).ToResponse())
            .WithName("ForwardMessage").WithTags("Messages").RequireAuthorization();
    }
    public sealed record Body(string TargetConversationId);
}
