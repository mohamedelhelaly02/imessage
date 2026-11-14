namespace Api.Infrastructure.Storage;

public sealed class ObjectStorageSettings
{
    public const string SectionName = "ObjectStorage";
    public string Endpoint { get; set; } = string.Empty;
    public string PublicEndpoint { get; set; } = string.Empty;
    public string Region { get; set; } = "us-east-1";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string AttachmentsBucket { get; set; } = string.Empty;
    public int MaxFileSizeBytes { get; set; } = 250 * 1024 * 1024;
    public int DownloadUrlExpirationMinutes { get; set; } = 5;
}
