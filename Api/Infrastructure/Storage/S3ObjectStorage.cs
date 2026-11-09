using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Api.Application.Interfaces;

namespace Api.Infrastructure.Storage;

public sealed class S3ObjectStorage(IAmazonS3 amazonS3) : IObjectStorage
{
    public Task<string> CreateDownloadUrlAsync(string bucket, string objectKey, int expirationMinutes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bucket);
        ArgumentException.ThrowIfNullOrWhiteSpace(objectKey);

        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(expirationMinutes);

        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucket,
            Key = objectKey,
            Expires = DateTime.UtcNow.AddMinutes(expirationMinutes),
            Verb = HttpVerb.GET
        };

        return Task.FromResult(amazonS3.GetPreSignedURL(request));
    }

    public async Task<long?> GetObjectSizeAsync(string bucket, string objectKey, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bucket);
        ArgumentException.ThrowIfNullOrWhiteSpace(objectKey);

        try
        {
            var response = await amazonS3.GetObjectMetadataAsync(bucket, objectKey, cancellationToken);
            return response.ContentLength;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task RemoveObjectAsync(string bucket, string objectKey, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bucket);
        ArgumentException.ThrowIfNullOrWhiteSpace(objectKey);

        try
        {
            await amazonS3.DeleteObjectAsync(new DeleteObjectRequest { BucketName = bucket, Key = objectKey }, cancellationToken);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
        }
    }

    public async Task UploadAsync(string bucket, string objectKey, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bucket);
        ArgumentException.ThrowIfNullOrWhiteSpace(objectKey);
        ArgumentNullException.ThrowIfNull(content);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);

        if (content.CanSeek)
            content.Position = 0;

        var request = new PutObjectRequest
        {
            BucketName = bucket,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false
        };

        await amazonS3.PutObjectAsync(request, cancellationToken);
    }
}
