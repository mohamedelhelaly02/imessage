namespace Api.Domain.Entities;

public sealed class MessageReaction : Entity
{
    public string MessageId { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public Message Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
