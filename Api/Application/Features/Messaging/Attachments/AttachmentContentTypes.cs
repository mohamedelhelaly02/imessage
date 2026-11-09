using Api.Domain.Enums;

namespace Api.Application.Features.Messaging.Attachments;

internal static class AttachmentContentTypes
{
    private static readonly IReadOnlyDictionary<MessageType, HashSet<string>> Supported =
        new Dictionary<MessageType, HashSet<string>>
        {
            [MessageType.Image] = ["image/jpeg", "image/png", "image/webp", "image/avif"],
            [MessageType.Video] = ["video/mp4", "video/webm", "video/quicktime"],
            [MessageType.Audio] = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/aac", "audio/flac"],
            [MessageType.VoiceNote] = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/aac", "audio/flac"],
            [MessageType.Document] = [
                "application/pdf", "text/plain", "text/csv", "application/rtf",
                "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/zip", "application/octet-stream"],
            [MessageType.Sticker] = ["image/png", "image/webp"],
            [MessageType.Gif] = ["image/gif"]
        };

    public static bool HasSupport(MessageType type) => Supported.ContainsKey(type);

    public static bool Supports(MessageType type, string contentType) =>
        Supported.TryGetValue(type, out var contentTypes) &&
        contentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
}
