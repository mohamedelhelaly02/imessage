using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Messaging.Messages;

public sealed class EditMessage : IEndpoint
{
    public sealed record Command(string MessageId, string Text) : IRequest<Result<SendMessage.Response>>;
    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator() => RuleFor(item => item.Text).NotEmpty().MaximumLength(10000);
    }

    public sealed class Handler(AppDbContext db, IUser user, IMessageNotifier notifier)
        : IRequestHandler<Command, Result<SendMessage.Response>>
    {
        public async Task<Result<SendMessage.Response>> Handle(Command request, CancellationToken token)
        {
            var message = await db.Messages.FirstOrDefaultAsync(item => item.Id == request.MessageId, token);
            if (message is null || message.DeletedAtUtc is not null)
                return Result<SendMessage.Response>.Failure(MessagingErrors.MessageNotFound);
            if (message.SenderUserId != user.Id || message.Type != Api.Domain.Enums.MessageType.Text ||
                message.CreatedAtUtc < DateTime.UtcNow.AddMinutes(-15))
                return Result<SendMessage.Response>.Failure(MessagingErrors.CannotEditMessage);

            message.Text = request.Text.Trim();
            message.EditedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(token);
            var response = await SendMessage.Handler.LoadResponseAsync(db, message.Id, token);
            await notifier.NotifyMessageChangedAsync(message.ConversationId, "MessageEdited", response!, token);
            return Result<SendMessage.Response>.Success(response!);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("messages/{messageId}", async (string messageId, Body body, ISender sender, CancellationToken token) =>
            (await sender.Send(new Command(messageId, body.Text), token)).ToResponse())
            .WithName("EditMessage").WithTags("Messages").RequireAuthorization();
    }
    public sealed record Body(string Text);
}
