namespace Api.Shared.Helpers;

internal sealed class OtpSettings
{
    public const string SectionName = "OtpSettings";

    public string Secret { get; set; } = string.Empty;

    public int OtpLength { get; set; }

    public int ExpirationMinutes { get; set; }

    public int MaxFailedAttempts { get; set; }

}
