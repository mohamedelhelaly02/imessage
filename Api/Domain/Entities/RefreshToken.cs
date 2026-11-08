namespace Api.Domain.Entities;

public sealed class RefreshToken : Entity
{
    public string FamilyId { get; set; } = Guid.NewGuid().ToString();
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string UserId { get; set; } = string.Empty;
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenId { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
    public bool IsActive => RevokedAtUtc is null && !IsExpired;
    public bool IsUsed { get; set; }

    public User User { get; set; } = null!;
}
