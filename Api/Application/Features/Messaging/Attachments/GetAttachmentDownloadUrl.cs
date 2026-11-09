using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Api.Infrastructure.Storage;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Application.Features.Messaging.Attachments;

public sealed class GetAttachmentDownloadUrl : IEndpoint
{
    public sealed record Query(string AttachmentId) : IRequest<Result<Response>>;
    public sealed record Response(string DownloadUrl, string FileName, string ContentType, long SizeBytes);

    public sealed class Handler(AppDbContext db, IUser user, IObjectStorage storage, IOptions<ObjectStorageSettings> settingsOptions)
        : IRequestHandler<Query, Result<Response>>
    {
        private readonly ObjectStorageSettings _settings = settingsOptions.Value;
        public async Task<Result<Response>> Handle(Query request, CancellationToken token)
        {
            var attachment = await db.MessageAttachments.AsNoTracking()
                .Where(file => file.Id == request.AttachmentId && file.Message.DeletedAtUtc == null &&
                    file.Message.Conversation.Participants.Any(participant => participant.UserId == user.Id))
                .Select(file => new { file.ObjectKey, file.FileName, file.ContentType, file.SizeBytes })
                .FirstOrDefaultAsync(token);
            if (attachment is null)
                return Result<Response>.Failure(MessagingErrors.MessageNotFound);

            var url = await storage.CreateDownloadUrlAsync(_settings.AttachmentsBucket, attachment.ObjectKey,
                _settings.DownloadUrlExpirationMinutes);
            return Result<Response>.Success(new Response(url, attachment.FileName, attachment.ContentType, attachment.SizeBytes));
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("attachments/{attachmentId}/download", async (
            string attachmentId, ISender sender, CancellationToken token) =>
            (await sender.Send(new Query(attachmentId), token)).ToResponse())
            .WithName("GetAttachmentDownloadUrl").WithTags("Message attachments").RequireAuthorization();
    }
}
