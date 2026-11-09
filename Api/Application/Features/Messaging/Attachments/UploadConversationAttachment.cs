using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Domain.Enums;
using Api.Infrastructure.Persistence;
using Api.Infrastructure.Storage;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Application.Features.Messaging.Attachments;

public sealed class UploadConversationAttachment : IEndpoint
{
    public sealed record Command(string ConversationId, MessageType Type, IFormFile? File) : IRequest<Result<Response>>;

    public sealed record Response(
        string UploadId,
        string FileName,
        string ContentType,
        long SizeBytes,
        DateTime ExpiresAtUtc);

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator(IOptions<ObjectStorageSettings> storageOptions)
        {
            RuleFor(item => item.ConversationId).NotEmpty();
            RuleFor(item => item.Type).Must(AttachmentContentTypes.HasSupport)
                .WithMessage("This message type does not support file attachments.");
            RuleFor(item => item.File).NotNull().WithMessage("A file is required.");
            RuleFor(item => item).Must(item => item.File is { Length: > 0 } file &&
                AttachmentContentTypes.Supports(item.Type, file.ContentType))
                .WithMessage("The file content type is not supported for this message type.");
            RuleFor(item => item).Must(item => item.File is null ||
                item.File.Length <= storageOptions.Value.MaxFileSizeBytes)
                .WithMessage("The file exceeds the permitted size.");
        }
    }

    public sealed class Handler(
        AppDbContext db,
        IUser user,
        IObjectStorage storage,
        IOptions<ObjectStorageSettings> storageOptions) : IRequestHandler<Command, Result<Response>>
    {
        public async Task<Result<Response>> Handle(Command request, CancellationToken token)
        {
            if (!await db.Participants.AnyAsync(item =>
                    item.ConversationId == request.ConversationId && item.UserId == user.Id, token))
                return Result<Response>.Failure(MessagingErrors.NotConversationParticipant);

            var file = request.File!;
            var now = DateTime.UtcNow;
            var expiresAt = now.AddHours(24);
            var uploadId = Guid.NewGuid().ToString();
            var fileName = Path.GetFileName(file.FileName);
            var objectKey = $"conversations/{request.ConversationId}/{uploadId}";
            var settings = storageOptions.Value;

            await using var stream = file.OpenReadStream();
            await storage.UploadAsync(settings.AttachmentsBucket, objectKey, stream, file.ContentType, token);

            var pendingUpload = new PendingObjectUpload
            {
                Id = uploadId,
                UserId = user.Id,
                ConversationId = request.ConversationId,
                FileName = fileName,
                ObjectKey = objectKey,
                ContentType = file.ContentType,
                SizeBytes = file.Length,
                CreatedAtUtc = now,
                ExpiresAtUtc = expiresAt
            };

            db.PendingObjectUploads.Add(pendingUpload);
            try
            {
                await db.SaveChangesAsync(token);
            }
            catch
            {
                await storage.RemoveObjectAsync(settings.AttachmentsBucket, objectKey, CancellationToken.None);
                throw;
            }

            return Result<Response>.Success(new Response(uploadId, fileName, file.ContentType, file.Length, expiresAt));
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("conversations/{conversationId}/attachments", async (
            string conversationId,
            [FromForm] MessageType type,
            [FromForm] IFormFile file,
            ISender sender,
            CancellationToken token) =>
            (await sender.Send(new Command(conversationId, type, file), token))
                .ToResponse(StatusCodes.Status201Created))
            .WithName("UploadConversationAttachment")
            .WithTags("Message attachments")
            .Produces<Response>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .RequireAuthorization()
            .DisableAntiforgery();
    }
}
