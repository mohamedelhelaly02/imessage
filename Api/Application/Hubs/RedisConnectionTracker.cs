using Api.Application.Interfaces;
using StackExchange.Redis;

namespace Api.Application.Hubs;

/// <summary>
/// Presence tracking in Redis. Each user has a set of connection ids under "presence:{userId}".
/// If Redis is unreachable the in-memory tracker is used so the chat keeps working.
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
    private readonly ConnectionTracker _fallback;
    private readonly ILogger<RedisConnectionTracker> _logger;

    public RedisConnectionTracker(
        IConnectionMultiplexer redis,
        ConnectionTracker fallback,
        ILogger<RedisConnectionTracker> logger)
    {
        _redis = redis;
        _fallback = fallback;
        _logger = logger;

        ClearStalePresence();
    }

    public bool AddConnection(string userId, string connectionId)
    {
        try
        {
            var result = (long)_redis.GetDatabase().ScriptEvaluate(
                AddScript,
                new RedisKey[] { KeyFor(userId) },
                new RedisValue[] { connectionId, TtlSeconds });

            return result == 1;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis presence unavailable, using in-memory tracker (add).");
            return _fallback.AddConnection(userId, connectionId);
        }
    }

    public bool RemoveConnection(string userId, string connectionId)
    {
        var fallbackWasLast = _fallback.RemoveConnection(userId, connectionId);

        try
        {
            var result = (long)_redis.GetDatabase().ScriptEvaluate(
                RemoveScript,
                new RedisKey[] { KeyFor(userId) },
                new RedisValue[] { connectionId });

            return result == 1 || fallbackWasLast;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis presence unavailable, using in-memory tracker (remove).");
            return fallbackWasLast;
        }
    }

    public bool IsOnline(string userId)
    {
        try
        {
            if (_redis.GetDatabase().KeyExists(KeyFor(userId)))
            {
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis presence unavailable, using in-memory tracker (read).");
        }

        return _fallback.IsOnline(userId);
    }

    public IReadOnlyCollection<string> GetOnlineUserIds()
    {
        var ids = new HashSet<string>(_fallback.GetOnlineUserIds());

        try
        {
            foreach (var key in ScanPresenceKeys())
            {
                ids.Add(key.ToString()[KeyPrefix.Length..]);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis presence unavailable, returning in-memory users only.");
        }

        return [.. ids];
    }

    // The API runs as a single instance. After a restart every old connection is gone,
    // so presence left in Redis by the previous process is stale and is removed.
    private void ClearStalePresence()
    {
        try
        {
            var db = _redis.GetDatabase();

            foreach (var key in ScanPresenceKeys())
            {
                db.KeyDelete(key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not clear stale presence keys.");
        }
    }

    private IEnumerable<RedisKey> ScanPresenceKeys()
    {
        foreach (var endpoint in _redis.GetEndPoints())
        {
            var server = _redis.GetServer(endpoint);

            foreach (var key in server.Keys(pattern: KeyPrefix + "*"))
            {
                yield return key;
            }
        }
    }

    private static RedisKey KeyFor(string userId) => KeyPrefix + userId;
}
