using Api.Application.Interfaces;
using Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Hubs;

[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
internal sealed class ChatHub(
    IUser currentUser,
    ILogger<ChatHub> logger,
    AppDbContext dbContext,
    IConnectionTracker connectionTracker) : Hub
{
    private const string GroupNamePrefix = "user:";
    private const string ConversationGroupPrefix = "conversation:";

    public override async Task OnConnectedAsync()
    {
        try
        {
            var userId = currentUser.Id;
            if (string.IsNullOrEmpty(userId))
                return;

            await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(userId));

            var isFirstConnection = connectionTracker.AddConnection(userId, Context.ConnectionId);

            if (isFirstConnection)
                await NotifyRelatedUsersStatus(userId, true);

        }
        finally
        {
            await base.OnConnectedAsync();
        }
    }

    private async Task NotifyRelatedUsersStatus(string userId, bool isOnline)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.UserName,
                u.Email,
                u.ProfilePictureUrl,
                u.LastSeenAtUtc
            })
            .FirstOrDefaultAsync();

        if (user is null)
            return;

        var relatedUserIds = await GetRelatedParticipantsOf(userId);

        var eventName = isOnline ? "UserOnline" : "UserOffline";

        if (relatedUserIds?.Count > 0)
        {
            foreach (var id in relatedUserIds)
                await Clients.Group(GetGroupName(id)).SendAsync(eventName, user);
        }

    }

    private static string GetGroupName(string userId)
        => $"{GroupNamePrefix}{userId}";

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var userId = currentUser.Id;

            if (string.IsNullOrWhiteSpace(userId))
            {
                return;
            }

            var isLastConnection = connectionTracker.RemoveConnection(
                userId,
                Context.ConnectionId);

            if (!isLastConnection)
            {
                return;
            }

            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

            if (user is not null)
            {
                await dbContext.Users.ExecuteUpdateAsync(
                    s => s.SetProperty(
                        u => u.LastSeenAtUtc, DateTime.UtcNow));
            }

            await NotifyRelatedUsersStatus(userId, isOnline: false);
        }
        finally
        {
            await base.OnDisconnectedAsync(exception);
        }
    }

    public Task NotifyCallerOnline()
    {
        return Clients.Caller.SendAsync("ReceiveCallerConnected");
    }

    public async Task GetOnlineStatus(IEnumerable<string> userIds)
    {
        var requestedUserIds = userIds?
               .Where(id => !string.IsNullOrWhiteSpace(id))
               .Distinct()
               .ToList();

        if (requestedUserIds is null || requestedUserIds.Count == 0)
        {
            return;
        }

        var users = await dbContext.Users
            .AsNoTracking()
            .Where(user => requestedUserIds.Contains(user.Id))
            .Select(user => new
            {
                user.Id,
                user.DisplayName,
                user.UserName,
                user.Email,
                user.ProfilePictureUrl,
                user.LastSeenAtUtc
            })
            .ToListAsync();

        var onlineStatuses = users
            .ConvertAll(user => new { user, isOnline = connectionTracker.IsOnline(user.Id) });

        await Clients.Caller.SendAsync("OnlineStatus", onlineStatuses);
    }

    public async Task JoinConversation(string conversationId)
    {
        var userId = currentUser.Id;
        var isUserParticipant = await dbContext.Participants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId &&
                p.UserId == userId);

        if (!isUserParticipant)
        {
            throw new HubException("You are not a participant in this conversation");
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            GetConversationGroupName(conversationId));

#pragma warning disable CA1873
        logger.LogInformation(
            "User {UserId} joined conversation {ConversationId}",
            userId,
            conversationId);
#pragma warning restore CA1873
    }

    public async Task LeaveConversation(string conversationId)
    {
        var userId = currentUser.Id;
        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            GetConversationGroupName(conversationId));

#pragma warning disable CA1873
        logger.LogInformation(
            "User {UserId} leaved conversation {ConversationId}",
            userId,
            conversationId);
#pragma warning restore CA1873

    }


    public async Task StartConversationTyping(string conversationId)
    {
        var userId = currentUser.Id;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var isParticipant = await dbContext.Participants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (!isParticipant)
        {
            throw new HubException("You are not participant in this conversation");
        }

        var relatedUserIds = await GetRelatedParticipantsOf(userId);

        if (relatedUserIds?.Count > 0)
        {
            foreach (var id in relatedUserIds)
            {
                await Clients.Group(GetGroupName(id))
                    .SendAsync("ConversationStartedTyping", conversationId);
            }

        }

    }

    private async Task<List<string>> GetRelatedParticipantsOf(string userId)
    {

        var conversationIds = await dbContext.Participants
                .AsNoTracking()
                .Where(p => p.UserId == userId)
                .Select(p => p.ConversationId)
                .ToListAsync();

        if (conversationIds.Count == 0)
            return [];

        var relatedUserIds = await dbContext.Participants
            .AsNoTracking()
            .Where(p => conversationIds.Contains(p.ConversationId) && p.UserId != userId)
            .Select(p => p.UserId)
            .Distinct()
            .ToListAsync();

        return relatedUserIds;
    }

    public async Task StopConversationTyping(string conversationId)
    {
        var userId = currentUser.Id;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var isParticipant = await dbContext.Participants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (!isParticipant)
        {
            throw new HubException("You are not participant in this conversation");
        }

        var relatedUserIds = await GetRelatedParticipantsOf(userId);

        if (relatedUserIds?.Count > 0)
        {
            foreach (var id in relatedUserIds)
            {
                await Clients.Group(GetGroupName(id))
                    .SendAsync("ConversationStoppedTyping", conversationId);
            }

        }
    }

    public async Task StartTyping(string conversationId)
    {
        var userId = currentUser.Id;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var isParticipant = await dbContext.Participants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (!isParticipant)
        {
            throw new HubException("You are not participant in this conversation");
        }

        await Clients.OthersInGroup(GetConversationGroupName(conversationId))
            .SendAsync("UserTyping", conversationId, userId);

    }

    public async Task StopTyping(string conversationId)
    {
        var userId = currentUser.Id;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var isParticipant = await dbContext.Participants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (!isParticipant)
        {
            throw new HubException("You are not participant in this conversation");
        }

        await Clients.OthersInGroup(
            GetConversationGroupName(conversationId)).SendAsync("UserStoppedTyping", conversationId, userId);

    }


    private static string GetConversationGroupName(string conversationId) => $"{ConversationGroupPrefix}{conversationId}";


}
