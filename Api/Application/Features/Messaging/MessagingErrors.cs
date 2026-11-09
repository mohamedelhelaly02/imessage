using Api.Shared.Abstraction;

namespace Api.Application.Features.Messaging;

public static class MessagingErrors
{
    public static Error NotConversationParticipant => Error.Forbidden(
        "Messaging.NotConversationParticipant", "You are not a participant in this conversation.");
    public static Error MessageNotFound => Error.NotFound(
        "Messaging.MessageNotFound", "The message was not found in a conversation you can access.");
    public static Error UploadNotFound => Error.NotFound(
        "Messaging.UploadNotFound", "The upload was not found or has expired.");
    public static Error InvalidUploadedObject => Error.Validation(
        "Messaging.InvalidUploadedObject", "The uploaded file is empty or exceeds the permitted size.");
    public static Error InvalidAttachments => Error.Validation(
        "Messaging.InvalidAttachments", "One or more uploaded files are incomplete or unavailable.");
    public static Error InvalidMessageType => Error.Validation(
        "Messaging.InvalidMessageType", "The message type and content do not match.");
    public static Error CannotEditMessage => Error.Forbidden(
        "Messaging.CannotEditMessage", "Only the sender can edit this message.");
    public static Error CannotDeleteMessage => Error.Forbidden(
        "Messaging.CannotDeleteMessage", "Only the sender or a conversation admin can delete this message.");
    public static Error InvalidReplyTarget => Error.Validation(
        "Messaging.InvalidReplyTarget", "The reply target is not in this conversation.");
    public static Error InvalidReaction => Error.Validation(
        "Messaging.InvalidReaction", "The reaction emoji is invalid.");
}
