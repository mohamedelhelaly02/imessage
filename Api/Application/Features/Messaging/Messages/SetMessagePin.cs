using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class SetMessagePin : IEndpoint
{
    public sealed record Command(string MessageId, bool IsPinned) : IRequest<Result>;

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken token)
        {
            var message = await db.Messages.FirstOrDefaultAsync(item => item.Id == request.MessageId, token);
            if (message is null || message.DeletedAtUtc is not null) return Result.Failure(MessagingErrors.MessageNotFound);
            bool admin = await db.Participants.AnyAsync(item => item.ConversationId == message.ConversationId &&
                item.UserId == user.Id && item.Role == Api.Domain.Enums.ParticipantRole.Admin, token);
            if (!admin) return Result.Failure(MessagingErrors.NotConversationParticipant);

            message.IsPinned = request.IsPinned;
            await db.SaveChangesAsync(token);
            await notifier.NotifyMessageChangedAsync(message.ConversationId, "MessagePinChanged",
                new { message.Id, message.IsPinned }, token);
            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("messages/{messageId}/pin", async (
            string messageId, Body body, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(messageId, body.IsPinned), token)).ToResponse())
            .WithName("SetMessagePin").WithTags("Messages").RequireAuthorization();
    }
    public sealed record Body(bool IsPinned);
}
