using Microsoft.AspNetCore.Identity;

namespace Api.Domain.Entities;

public sealed class User : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public DateTime? LastSeenAtUtc { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<Conversation> Conversations { get; set; } = [];
    public ICollection<Participant> Participants { get; set; } = [];
}
