namespace Api.Shared.Helpers;

public sealed class JwtSettings
{
    public const string SectionName = "JwtSettings";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationInMinutes { get; set; } = 5;
    public int RefreshTokenExpirationInDays { get; set; } = 7;
}
