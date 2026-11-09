namespace Api.Domain.Entities;

public sealed class MessageReceipt : Entity
{
    public string MessageId { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public DateTime? DeliveredAtUtc { get; set; }
    public DateTime? ReadAtUtc { get; set; }
    public Message Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
