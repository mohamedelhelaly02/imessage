using Api.Application.Features.Messaging.Attachments;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Domain.Enums;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace Api.Application.Features.Messaging.Messages;

public sealed class SendMessage : IEndpoint
{
    public sealed record Command(
        string ConversationId,
        Guid ClientMessageId,
        MessageType Type,
        string? Text,
        string? ContentJson,
        string? ReplyToMessageId,
        List<string> AttachmentUploadIds) : IRequest<Result<Response>>;

    public sealed record AttachmentResponse(
        string Id, string FileName, string ContentType, long SizeBytes, int? Width, int? Height, double? DurationSeconds);
    public sealed record ReactionResponse(string UserId, string DisplayName, string Emoji);
    public sealed record ReceiptResponse(string UserId, string DisplayName, DateTime? DeliveredAtUtc, DateTime? ReadAtUtc);
    public sealed record Response(
        string Id, string ConversationId, string SenderUserId, string SenderDisplayName,
        MessageType Type, string? Text, string? ContentJson, string? ReplyToMessageId,
        bool IsPinned, bool IsForwarded, DateTime CreatedAtUtc, DateTime? EditedAtUtc,
        DateTime? DeletedAtUtc, IReadOnlyList<AttachmentResponse> Attachments,
        IReadOnlyList<ReactionResponse> Reactions, IReadOnlyList<ReceiptResponse> Receipts);

    public sealed class Validator : AbstractValidator<Command>
    {
        private static readonly MessageType[] AttachmentTypes =
        [MessageType.Image, MessageType.Video, MessageType.Audio, MessageType.VoiceNote,
            MessageType.Document, MessageType.Sticker, MessageType.Gif];

        public Validator()
        {
            RuleFor(item => item.ConversationId).NotEmpty();
            RuleFor(item => item.ClientMessageId).NotEqual(Guid.Empty);
            RuleFor(item => item.Type).Must(type => Enum.IsDefined(type) && type != MessageType.System);
            RuleFor(item => item.Text).MaximumLength(10000);
            RuleFor(item => item.ContentJson).MaximumLength(20000);
            RuleFor(item => item.AttachmentUploadIds).NotNull().Must(items => items is { Count: <= 10 });
            RuleFor(item => item.AttachmentUploadIds)
                .Must(items => items is not null && items.Distinct(StringComparer.Ordinal).Count() == items.Count);
            RuleFor(item => item).Must(item => item.Type switch
            {
                MessageType.Text => !string.IsNullOrWhiteSpace(item.Text) && item.AttachmentUploadIds is { Count: 0 },
                MessageType.Location or MessageType.Contact or MessageType.Link => IsJsonObject(item.ContentJson),
                _ when AttachmentTypes.Contains(item.Type) => item.AttachmentUploadIds is { Count: > 0 },
                _ => false
            }).WithMessage("Message type, content, and attachments do not match.");
        }

        private static bool IsJsonObject(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            try
            {
                using var document = JsonDocument.Parse(value);
                return document.RootElement.ValueKind == JsonValueKind.Object;
            }
            catch (JsonException) { return false; }
        }
    }

    public sealed class Handler(
        AppDbContext dbContext,
        IUser currentUser,
        IMessageNotifier notifier) : IRequestHandler<Command, Result<Response>>
    {
        public async Task<Result<Response>> Handle(Command request, CancellationToken cancellationToken)
        {
            var duplicate = await dbContext.Messages.AsNoTracking()
                .Where(item => item.SenderUserId == currentUser.Id && item.ClientMessageId == request.ClientMessageId)
                .Select(item => new { item.Id, item.ConversationId })
                .FirstOrDefaultAsync(cancellationToken);
            if (duplicate is not null && duplicate.ConversationId == request.ConversationId)
            {
                var existing = await LoadResponseAsync(dbContext, duplicate.Id, cancellationToken);
                return Result<Response>.Success(existing!);
            }
            if (duplicate is not null)
                return Result<Response>.Failure(MessagingErrors.InvalidMessageType);

            bool isParticipant = await dbContext.Participants.AnyAsync(
                item => item.ConversationId == request.ConversationId && item.UserId == currentUser.Id,
                cancellationToken);
            if (!isParticipant)
                return Result<Response>.Failure(MessagingErrors.NotConversationParticipant);

            if (!string.IsNullOrWhiteSpace(request.ReplyToMessageId) &&
                !await dbContext.Messages.AnyAsync(item => item.Id == request.ReplyToMessageId &&
                    item.ConversationId == request.ConversationId && item.DeletedAtUtc == null, cancellationToken))
            {
                return Result<Response>.Failure(MessagingErrors.InvalidReplyTarget);
            }

            await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

            var now = DateTime.UtcNow;
            var pendingUploads = request.AttachmentUploadIds.Count == 0
                ? []
                : await dbContext.PendingObjectUploads
                    .Where(item => request.AttachmentUploadIds.Contains(item.Id) &&
                        item.UserId == currentUser.Id && item.ConversationId == request.ConversationId &&
                        item.ConsumedAtUtc == null && item.ExpiresAtUtc > now)
                    .ToListAsync(cancellationToken);

            if (pendingUploads.Count != request.AttachmentUploadIds.Count)
                return Result<Response>.Failure(MessagingErrors.InvalidAttachments);

            if (pendingUploads.Any(item => !AttachmentContentTypes.Supports(request.Type, item.ContentType)))
                return Result<Response>.Failure(MessagingErrors.InvalidAttachments);

            var message = new Message
            {
                ConversationId = request.ConversationId,
                SenderUserId = currentUser.Id,
                ClientMessageId = request.ClientMessageId,
                Type = request.Type,
                Text = request.Text?.Trim(),
                ContentJson = request.ContentJson,
                ReplyToMessageId = request.ReplyToMessageId,
                CreatedAtUtc = now,
                Attachments = [.. pendingUploads.Select(item => new MessageAttachment
                {
                    ObjectKey = item.ObjectKey,
                    FileName = item.FileName,
                    ContentType = item.ContentType,
                    SizeBytes = item.SizeBytes,
                    Width = item.Width,
                    Height = item.Height,
                    DurationSeconds = item.DurationSeconds,
                    CreatedAtUtc = now
                })]
            };

            foreach (var pendingUpload in pendingUploads)
                pendingUpload.ConsumedAtUtc = now;

            List<string> recipientIds = await dbContext.Participants.AsNoTracking()
                .Where(item => item.ConversationId == request.ConversationId && item.UserId != currentUser.Id)
                .Select(item => item.UserId).ToListAsync(cancellationToken);

            message.Receipts = [.. recipientIds.Select(
                userId => new MessageReceipt
                {
                    UserId = userId,
                    DeliveredAtUtc = null,
                    ReadAtUtc = null
                })];

            dbContext.Messages.Add(message);

            var conversation = await dbContext.Conversations.FirstAsync(item => item.Id == request.ConversationId, cancellationToken);
            conversation.LastMessageAtUtc = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var response = await LoadResponseAsync(dbContext, message.Id, cancellationToken);

            await notifier.NotifyMessageCreatedAsync(request.ConversationId, response!, cancellationToken);

            return Result<Response>.Success(response!);
        }

        public static async Task<Response?> LoadResponseAsync(AppDbContext db, string messageId, CancellationToken token)
            => await db.Messages.AsNoTracking()
                .Where(item => item.Id == messageId)
                .Select(item => new Response(
                    item.Id, item.ConversationId, item.SenderUserId, item.Sender.DisplayName,
                    item.Type, item.Text, item.ContentJson,
                    item.ReplyToMessageId, item.IsPinned, item.IsForwarded, item.CreatedAtUtc, item.EditedAtUtc,
                    item.DeletedAtUtc,
                    item.Attachments.Select(file => new AttachmentResponse(file.Id, file.FileName, file.ContentType,
                        file.SizeBytes, file.Width, file.Height, file.DurationSeconds)).ToList(),
                    item.Reactions.Select(reaction => new ReactionResponse(reaction.UserId, reaction.User.DisplayName,
                        reaction.Emoji)).ToList(),
                    item.Receipts.Select(receipt => new ReceiptResponse(receipt.UserId, receipt.User.DisplayName,
                        receipt.DeliveredAtUtc, receipt.ReadAtUtc)).ToList()))
                .FirstOrDefaultAsync(token);
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("conversations/{conversationId}/messages", async (
            string conversationId,
            Body request,
            ISender sender,
            CancellationToken cancellationToken) =>
            (await sender.Send(new Command(conversationId, request.ClientMessageId, request.Type, request.Text,
                request.ContentJson, request.ReplyToMessageId, request.AttachmentUploadIds), cancellationToken))
                .ToResponse(StatusCodes.Status201Created))
            .WithName("SendMessage")
            .WithTags("Messages")
            .Produces<Response>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .RequireAuthorization();
    }

    public sealed record Body(Guid ClientMessageId, MessageType Type, string? Text, string? ContentJson,
        string? ReplyToMessageId, List<string> AttachmentUploadIds);
}
