using Api.Domain.Enums;

namespace Api.Domain.Entities;

public sealed class Participant : Entity
{
    public string UserId { get; set; } = null!;
    public string ConversationId { get; set; } = null!;
    public ParticipantRole Role { get; set; }
    public DateTime JoinedAtUtc { get; set; }
    public Conversation Conversation { get; set; } = null!;
    public User User { get; set; } = null!;
}