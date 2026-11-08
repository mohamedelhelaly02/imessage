using Api.Shared.Abstraction;

namespace Api.Application.Features.Conversations;

public static class ConversationErrors
{
    public static Error NotChatYourSelf => Error.Validation(
        ".NOT_CHAT_YOURSELF",
         "Cannot create a private conversation with yourself.");

    public static Error EmptyParticipants => Error.Validation("Conversation.EmptyParticipants", "A group must have other participants besides the creator.");

    public static Error UsersNotExists => Error.Validation("Conversation.UsersNotExists", "One or more specified users do not exist.");
}
