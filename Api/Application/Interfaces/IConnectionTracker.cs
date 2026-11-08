namespace Api.Application.Interfaces;

internal interface IConnectionTracker
{
    bool AddConnection(string userId, string connectionId);

    bool RemoveConnection(string userId, string connectionId);

    bool IsOnline(string userId);

    IReadOnlyCollection<string> GetOnlineUserIds();
}
