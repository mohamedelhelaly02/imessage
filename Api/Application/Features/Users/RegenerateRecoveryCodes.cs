using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Features.Users;

public sealed class RegenerateRecoveryCodes : IEndpoint
{
    public sealed record Command(string Password) : IRequest<Result<IReadOnlyList<string>>>;

    public sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(request => request.Password).NotEmpty();
        }
    }

    public sealed class Handler(
        IUser currentUser,
        UserManager<User> userManager) : IRequestHandler<Command, Result<IReadOnlyList<string>>>
    {
        public async Task<Result<IReadOnlyList<string>>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? user = await userManager.FindByIdAsync(currentUser.Id);
            if (user is null)
                return Result<IReadOnlyList<string>>.Failure(UserErrors.UserNotFound);
            if (!user.TwoFactorEnabled)
                return Result<IReadOnlyList<string>>.Failure(UserErrors.TwoFactorNotEnabled);
            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return Result<IReadOnlyList<string>>.Failure(UserErrors.InvalidPassword);

            IEnumerable<string>? recoveryCodes =
                await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
            return recoveryCodes is null
                ? Result<IReadOnlyList<string>>.Failure(Error.Failure("Unable to generate recovery codes."))
                : Result<IReadOnlyList<string>>.Success(recoveryCodes.ToArray());
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("users/me/two-factor/recovery-codes", async (Command command, ISender sender) =>
                (await sender.Send(command)).ToResponse())
            .WithName("RegenerateRecoveryCodes")
            .WithTags("Users")
            .RequireAuthorization()
            .Produces<IReadOnlyList<string>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }
}
