namespace Api.Application.Interfaces;

/// <summary>
/// Tracks which users are connected to the chat hub. Implementations must never throw,
/// so a storage outage cannot break a hub call.
/// </summary>
internal interface IConnectionTracker
{
    /// <summary>Returns true when this was the user's first connection (the user just came online).</summary>
    Task<bool> AddConnectionAsync(string userId, string connectionId);

    /// <summary>Returns true when this was the user's last connection (the user just went offline).</summary>
    Task<bool> RemoveConnectionAsync(string userId, string connectionId);

    Task<IReadOnlySet<string>> GetOnlineUsersAsync(IEnumerable<string> userIds);
}
