using Api.Application.Features.Auth.Email;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Extensions;
using Api.Shared.Helpers;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Api.Application.Features.Auth;

internal sealed class Register : IEndpoint
{
    public enum ClientType { Mobile, Web };

    internal sealed record Command(
        string DisplayName,
        string Email,
        string Password,
        ClientType ClientType) : IRequest<Result<string>>;

    internal sealed class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.DisplayName)
                .NotEmpty().WithMessage("Display name is required.")
                .MaximumLength(100).WithMessage("Display name cannot exceed 100 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Invalid email format.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .Matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$")
                .WithMessage("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character.");
        }
    }

    internal sealed class Handler(
        UserManager<User> userManager,
        IEmailConfirmationStrategyResolver resolver) : IRequestHandler<Command, Result<string>>
    {
        public async Task<Result<string>> Handle(Command request, CancellationToken cancellationToken)
        {
            User? existingUser = await userManager.FindByEmailAsync(request.Email);

            if (existingUser is not null)
                return Result<string>.Failure(UserErrors.EmailInUse);

            string encodedName = Uri.EscapeDataString(request.DisplayName);
            string defaultPictureUrl = $"https://ui-avatars.com/api/?name={encodedName}&background=25D366&color=fff&size=128&bold=true";

            User user = new()
            {
                DisplayName = request.DisplayName,
                Email = request.Email,
                UserName = request.Email.Split('@')[0],
                ProfilePictureUrl = defaultPictureUrl,
                EmailConfirmed = false
            };

            IdentityResult createResult = await userManager.CreateAsync(user, request.Password);

            if (!createResult.Succeeded)
            {
                var errorDictionary = new Dictionary<string, List<string>>();

                foreach (var error in createResult.Errors)
                {
                    string fieldName = error.Code.Contains("Password", StringComparison.OrdinalIgnoreCase)
                        ? "password"
                        : "general";

                    if (!errorDictionary.ContainsKey(fieldName))
                        errorDictionary[fieldName] = [];

                    errorDictionary[fieldName].Add(error.Description);

                }

                Dictionary<string, string[]>? formattedErrors = errorDictionary.ToDictionary(k => k.Key, v => v.Value.ToArray());

                return Result<string>.Failure(UserErrors.RegistrationFailed(formattedErrors));
            }

            IdentityResult addToRoleResult = await userManager.AddToRoleAsync(user, "User");

            if (!addToRoleResult.Succeeded)
            {
                Dictionary<string, string[]>? errors = addToRoleResult.Errors
                    .GroupBy(e => e.Code)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

                return Result<string>.Failure(UserErrors.RoleAssignmentFailed(errors));
            }

            IEmailConfirmationStrategy strategy = resolver.Resolve(request.ClientType);

            var result = await strategy.SendConfirmationEmailAsync(user, cancellationToken);

            if (!result.IsSuccess)
                return Result<string>.Failure(result.Error!);

            return Result<string>.Success(
                request.ClientType == ClientType.Web
                    ? "Registration completed successfully. Check your inbox and confirm your email."
                    : "Registration completed successfully. Check your inbox for the confirmation code.");
        }
    }

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("auth/register", async ([FromBody] Command command, ISender sender) =>
        {
            Result<string> result = await sender.Send(command);
            return result.ToResponse();
        })
        .AllowAnonymous()
        .WithName("Register")
        .WithTags("Auth")
        .ProducesProblem(StatusCodes.Status409Conflict)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status200OK);
    }

}
