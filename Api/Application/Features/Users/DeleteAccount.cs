using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Users;

public sealed class DeleteAccount : IEndpoint
{
    public sealed record Command(string Password, string? TwoFactorCode) : IRequest<Result>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Password).NotEmpty();
            RuleFor(request => request.TwoFactorCode)
                .Matches("^\\d{6}$")
                .When(request => !string.IsNullOrWhiteSpace(request.TwoFactorCode));
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager,
        AppDbContext dbContext,
        IHttpContextAccessor httpContextAccessor) : IRequestHandler<Command, Result>
    {
        public async Task<Result> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result.Failure(UserErrors.UserNotFound);
            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return Result.Failure(UserErrors.InvalidPassword);
            if (user.TwoFactorEnabled &&
                !await userManager.VerifyTwoFactorTokenAsync(
                    user,
                    TokenOptions.DefaultAuthenticatorProvider,
                    request.TwoFactorCode ?? string.Empty))
                return Result.Failure(UserErrors.InvalidAuthenticatorCode);

            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            List<Conversation> ownedConversations = await dbContext.Conversations
                .Where(conversation => conversation.CreatedById == user.Id)
                .ToListAsync(cancellationToken);
            string[] ownedConversationIds = [.. ownedConversations.Select(conversation => conversation.Id)];

            List<Participant> affectedParticipants = await dbContext.Participants
                .Where(participant => participant.UserId == user.Id ||
                                      ownedConversationIds.Contains(participant.ConversationId))
                .ToListAsync(cancellationToken);

            List<Conversation> emptyOwnedConversations = [];
            foreach (Conversation conversation in ownedConversations)
            {
                Participant? successor = affectedParticipants.FirstOrDefault(
                    participant => participant.ConversationId == conversation.Id &&
                                   participant.UserId != user.Id);
                if (successor is null)
                    emptyOwnedConversations.Add(conversation);
                else
                    conversation.CreatedById = successor.UserId;
            }

            dbContext.Participants.RemoveRange(
                affectedParticipants.Where(participant => participant.UserId == user.Id));
            dbContext.Conversations.RemoveRange(emptyOwnedConversations);

            IdentityResult deleteResult = await userManager.DeleteAsync(user);
            if (!deleteResult.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                Dictionary<string, string[]> errors = deleteResult.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
                return Result.Failure(Error.Validation("User.ACCOUNT_DELETE_FAILED", "Account deletion failed.", errors));
            }

            await transaction.CommitAsync(cancellationToken);
            CookieHelper.DeleteRefreshTokenCookie(httpContextAccessor.HttpContext!.Response);
            return Result.Success();
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/delete-account", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse(StatusCodes.Status204NoContent))
            .WithName("DeleteMyAccount")
            .WithTags("Users")
            .RequireAuthorization()
            .RequireRateLimiting("AuthLimiter")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
