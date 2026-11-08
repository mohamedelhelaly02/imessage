using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Domain.Enums;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Api.Application.Features.Conversations;

public sealed class CreateGroup : IEndpoint
{
    public sealed record Command(string Title, List<string> ParticipantIds) : IRequest<Result<string>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Group title is required.")
                .MaximumLength(100).WithMessage("Group title cannot exceed 100 characters.");

            RuleFor(x => x.ParticipantIds)
                .NotNull().WithMessage("Participant list cannot be null.")
                .NotEmpty().WithMessage("A group must have at least one participant.")
                .Must(ids => ids != null && ids.Distinct().Count() == ids.Count)
                .WithMessage("Participant list contains duplicate user IDs.");

        }
    }

    public sealed class Handler(
        AppDbContext dbContext,
        IUser user) : IRequestHandler<Command, Result<string>>
    {
        public async Task<Result<string>> Handle(Command request, CancellationToken cancellationToken)
        {
            string currentUserId = user.Id;

            var distinctParticipantIds = request.ParticipantIds
                .Where(id => id != currentUserId)
                .Distinct()
                .ToList();

            if (distinctParticipantIds.Count == 0)
                return Result<string>.Failure(ConversationErrors.EmptyParticipants);

            var existingUserIds = await dbContext.Users
                .Where(u => distinctParticipantIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            if (existingUserIds.Count != distinctParticipantIds.Count)
                return Result<string>.Failure(ConversationErrors.UsersNotExists);


            var conversation = new Conversation
            {
                Title = request.Title.Trim(),
                Type = ConversationType.Group,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedById = currentUserId
            };

            var participants = new HashSet<Participant>
            {
                new()
                {
                    UserId = currentUserId,
                    ConversationId = conversation.Id,
                    Role = ParticipantRole.Admin,
                    JoinedAtUtc = DateTime.UtcNow
                }
            };

            foreach (var userId in existingUserIds)
            {
                participants.Add(new Participant
                {
                    UserId = userId,
                    ConversationId = conversation.Id,
                    Role = ParticipantRole.Member,
                    JoinedAtUtc = DateTime.UtcNow
                });
            }

            conversation.Participants = participants;

            dbContext.Conversations.Add(conversation);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Result<string>.Success(conversation.Id);
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("conversations/group", async (Command command, ISender sender) =>
        {
            var result = await sender.Send(command);

            return result.ToResponse();
        })
        .RequireAuthorization(options => options.RequireAuthenticatedUser())
        .WithName("CreateGroup")
        .WithTags("Conversations")
        .ProducesValidationProblem(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces<string>(StatusCodes.Status200OK);
    }
}