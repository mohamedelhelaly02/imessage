using Api.Domain.Entities;
using Api.Shared.Abstraction;
using static Api.Application.Features.Auth.Register;

namespace Api.Application.Features.Auth.Email;

internal interface IEmailConfirmationStrategy
{
    abstract ClientType ClientType { get; }
    Task<Result<bool>> SendConfirmationEmailAsync(User user, CancellationToken cancellationToken = default);
}
