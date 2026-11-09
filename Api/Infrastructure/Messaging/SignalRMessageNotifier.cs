using Api.Application.Hubs;
using Api.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Api.Infrastructure.Messaging;

internal sealed class SignalRMessageNotifier(IHubContext<ChatHub> hub) : IMessageNotifier
{
    public Task NotifyMessageCreatedAsync(
        string conversationId,
        object message,
        CancellationToken cancellationToken)
        => hub.Clients.Group($"conversation:{conversationId}")
            .SendAsync("MessageCreated", message, cancellationToken);

    public Task NotifyMessageChangedAsync(
        string conversationId,
        string eventName,
        object payload,
        CancellationToken cancellationToken)
        => hub.Clients.Group($"conversation:{conversationId}")
            .SendAsync(eventName, payload, cancellationToken);
}
