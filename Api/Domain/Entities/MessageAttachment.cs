namespace Api.Domain.Entities;

public sealed class MessageAttachment : Entity
{
    public string MessageId { get; set; } = null!;

    public string ObjectKey { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }

    public int? Width { get; set; }
    public int? Height { get; set; }
    public double? DurationSeconds { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Message Message { get; set; } = null!;
}
