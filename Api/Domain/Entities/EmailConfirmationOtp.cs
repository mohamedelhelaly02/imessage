namespace Api.Domain.Entities;

public sealed class EmailConfirmationOtp : Entity
{
    public string UserId { get; set; } = null!;
    public string CodeHash { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }
    public User User { get; set; } = null!;
}
