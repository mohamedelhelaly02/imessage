namespace Api.Application.Interfaces;

public interface IMessageNotifier
{
    Task NotifyMessageCreatedAsync(string conversationId, object message, CancellationToken cancellationToken);
    Task NotifyMessageChangedAsync(string conversationId, string eventName, object payload, CancellationToken cancellationToken);
}
