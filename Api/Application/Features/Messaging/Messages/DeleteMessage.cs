using Api.Application.Interfaces;
using Api.Domain.Enums;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class DeleteMessage : IEndpoint
{
    public sealed record Command(string MessageId) : IRequest<Result>;

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier)
        : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken token)
        {
            var message = await db.Messages.FirstOrDefaultAsync(item => item.Id == request.MessageId, token);
            if (message is null || message.DeletedAtUtc is not null)
                return Result.Failure(MessagingErrors.MessageNotFound);
            if (message.SenderUserId != user.Id)
            {
                bool isAdmin = await db.Participants.AnyAsync(item => item.ConversationId == message.ConversationId &&
                    item.UserId == user.Id && item.Role == ParticipantRole.Admin, token);
                if (!isAdmin) return Result.Failure(MessagingErrors.CannotDeleteMessage);
            }

            message.Text = null;
            message.ContentJson = null;
            message.DeletedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(token);
            await notifier.NotifyMessageChangedAsync(message.ConversationId, "MessageDeleted",
                new { message.Id, message.ConversationId, message.DeletedAtUtc }, token);
            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("messages/{messageId}", async (string messageId, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(messageId), token)).ToResponse())
            .WithName("DeleteMessage").WithTags("Messages").RequireAuthorization();
    }
}
