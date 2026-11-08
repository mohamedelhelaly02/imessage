using System.Collections.Concurrent;
using Api.Application.Interfaces;

namespace Api.Infrastructure;

internal sealed class ConnectionTracker(ILogger<ConnectionTracker> logger) : IConnectionTracker
{
    private readonly Lock _lock = new();
    private readonly ConcurrentDictionary<string, HashSet<string>> _connections = [];

    public bool AddConnection(string userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_connections.TryGetValue(userId, out var connections))
            {
                connections = [];
                _connections[userId] = connections;
            }

            var wasOffline = connections.Count == 0;

            connections.Add(connectionId);

#pragma warning disable CA1873 // Avoid potentially expensive logging
            logger.LogInformation("User Connected: {UserId} {ConnectionId}", userId, connectionId);
#pragma warning restore CA1873 // Avoid potentially expensive logging

            return wasOffline;
        }
    }

    public IReadOnlyCollection<string> GetOnlineUserIds()
    {
        lock (_lock)
        {
            return [.. _connections.Keys];
        }
    }

    public bool IsOnline(string userId)
    {
        lock (_lock)
        {
            return _connections.ContainsKey(userId);
        }
    }

    public bool RemoveConnection(string userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_connections.TryGetValue(userId, out var connections))
                return false;

            connections.Remove(connectionId);

            if (connections?.Count > 0)
                return false;

            _connections.TryRemove(userId, out var _);

            return true;
        }
    }

}
