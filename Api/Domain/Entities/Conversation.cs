using Api.Domain.Enums;
using NanoidDotNet;

namespace Api.Domain.Entities;

public sealed class Conversation : Entity
{
    public string PublicId { get; set; } = Nanoid.Generate(size: 10);
    public string? Title { get; set; }
    public ConversationType Type { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastMessageAtUtc { get; set; }
    public string CreatedById { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public HashSet<Participant> Participants { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
}
