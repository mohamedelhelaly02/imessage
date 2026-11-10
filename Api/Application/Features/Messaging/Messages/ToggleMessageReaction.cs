using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class ToggleMessageReaction : IEndpoint
{
    public sealed record Command(string MessageId, string Emoji) : IRequest<Result<Response>>;
    public sealed record Response(string MessageId, string UserId, string DisplayName, string Emoji, bool IsRemoved);
    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator() => RuleFor(item => item.Emoji).NotEmpty().MaximumLength(16)
            .Must(value => !value.Any(char.IsControl));
    }

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier)
        : IRequestHandler<Command, Result<Response>>
    {
        public async Task<Result<Response>> Handle(Command request, CancellationToken token)
        {
            var message = await db.Messages.FirstOrDefaultAsync(item => item.Id == request.MessageId, token);
            if (message is null || message.DeletedAtUtc is not null)
                return Result<Response>.Failure(MessagingErrors.MessageNotFound);

            bool participant = await db.Participants.AnyAsync(item => item.ConversationId == message.ConversationId &&
                item.UserId == user.Id, token);
            if (!participant) return Result<Response>.Failure(MessagingErrors.NotConversationParticipant);

            var existing = await db.MessageReactions.FirstOrDefaultAsync(item => item.MessageId == message.Id &&
                item.UserId == user.Id && item.Emoji == request.Emoji, token);
            bool removed = existing is not null;
            if (existing is null)
            {
                db.MessageReactions.Add(new MessageReaction
                {
                    MessageId = message.Id,
                    UserId = user.Id,
                    Emoji = request.Emoji,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                db.MessageReactions.Remove(existing);
            }

            await db.SaveChangesAsync(token);
            string displayName = await db.Users.Where(item => item.Id == user.Id)
                .Select(item => item.DisplayName).FirstAsync(token);
            var response = new Response(message.Id, user.Id, displayName, request.Emoji, removed);
            await notifier.NotifyMessageChangedAsync(message.ConversationId, "MessageReactionChanged", response, token);
            return Result<Response>.Success(response);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("messages/{messageId}/reactions", async (
            string messageId, Body body, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(messageId, body.Emoji), token)).ToResponse())
            .WithName("ToggleMessageReaction").WithTags("Message reactions").RequireAuthorization();
    }
    public sealed record Body(string Emoji);
}
