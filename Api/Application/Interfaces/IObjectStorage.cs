namespace Api.Application.Interfaces;

public interface IObjectStorage
{
    Task UploadAsync(
         string bucket,
         string objectKey,
         Stream content,
         string contentType,
         CancellationToken cancellationToken = default);

    Task<string> CreateDownloadUrlAsync(
        string bucket,
        string objectKey,
        int expirationMinutes);

    Task<long?> GetObjectSizeAsync(
        string bucket,
        string objectKey,
        CancellationToken cancellationToken = default);

    Task RemoveObjectAsync(
        string bucket,
        string objectKey,
        CancellationToken cancellationToken = default);
}
