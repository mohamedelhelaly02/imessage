using Api.Application.Interfaces;
using StackExchange.Redis;

namespace Api.Application.Hubs;

/// <summary>
/// Connection tracking in Redis. Each user has a set of connection ids under "presence:{userId}".
/// Every method catches Redis errors and only logs them: when Redis is unreachable the chat keeps
/// working, but online status is not updated (users read as offline) until Redis is back.
/// </summary>
internal sealed class RedisConnectionTracker : IConnectionTracker
{
    private const string KeyPrefix = "presence:";
    private const int TtlSeconds = 24 * 60 * 60;

    private const string AddScript =
        "redis.call('SADD', KEYS[1], ARGV[1]) " +
        "redis.call('EXPIRE', KEYS[1], ARGV[2]) " +
        "return redis.call('SCARD', KEYS[1])";

    private const string RemoveScript =
        "local removed = redis.call('SREM', KEYS[1], ARGV[1]) " +
        "local left = redis.call('SCARD', KEYS[1]) " +
        "if removed == 1 and left == 0 then return 1 end " +
        "return 0";

    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisConnectionTracker> _logger;

    public RedisConnectionTracker(IConnectionMultiplexer redis, ILogger<RedisConnectionTracker> logger)
    {
        _redis = redis;
        _logger = logger;

        ClearStalePresence();
    }

    public async Task<bool> AddConnectionAsync(string userId, string connectionId)
    {
        try
        {
            var count = (long)await _redis.GetDatabase().ScriptEvaluateAsync(
                AddScript,
                [KeyFor(userId)],
                [connectionId, TtlSeconds]);

            return count == 1;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable, could not track connection for user {UserId}.", userId);
            return false;
        }
    }

    public async Task<bool> RemoveConnectionAsync(string userId, string connectionId)
    {
        try
        {
            var wasLast = (long)await _redis.GetDatabase().ScriptEvaluateAsync(
                RemoveScript,
                [KeyFor(userId)],
                [connectionId]);

            return wasLast == 1;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable, could not untrack connection for user {UserId}.", userId);
            return false;
        }
    }

    public async Task<IReadOnlySet<string>> GetOnlineUsersAsync(IEnumerable<string> userIds)
    {
        var ids = userIds.Distinct().ToList();

        try
        {
            var db = _redis.GetDatabase();
            var checks = await Task.WhenAll(ids.Select(id => db.KeyExistsAsync(KeyFor(id))));

            return ids.Where((_, index) => checks[index]).ToHashSet();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable, reporting users as offline.");
            return new HashSet<string>();
        }
    }

    // The API runs as a single instance. After a restart every old connection is gone,
    // so presence left in Redis by the previous process is stale and is removed.
    private void ClearStalePresence()
    {
        try
        {
            var db = _redis.GetDatabase();

            foreach (var endpoint in _redis.GetEndPoints())
            {
                foreach (var key in _redis.GetServer(endpoint).Keys(pattern: KeyPrefix + "*"))
                {
                    db.KeyDelete(key);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not clear stale presence keys.");
        }
    }

    private static RedisKey KeyFor(string userId) => KeyPrefix + userId;
}
