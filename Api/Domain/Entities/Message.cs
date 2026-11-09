using Api.Domain.Enums;

namespace Api.Domain.Entities;

public sealed class Message : Entity
{
    public string ConversationId { get; set; } = null!;
    public string SenderUserId { get; set; } = null!;
    public MessageType Type { get; set; }
    public Guid ClientMessageId { get; set; }
    public string? Text { get; set; }
    public string? ContentJson { get; set; }
    public string? ReplyToMessageId { get; set; }
    public bool IsPinned { get; set; }
    public bool IsForwarded { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? EditedAtUtc { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public Message? ReplyToMessage { get; set; }
    public ICollection<MessageAttachment> Attachments { get; set; } = [];
    public ICollection<MessageReceipt> Receipts { get; set; } = [];
    public ICollection<MessageReaction> Reactions { get; set; } = [];
}
