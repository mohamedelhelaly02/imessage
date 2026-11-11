using Api.Shared.Abstraction;

namespace Api.Application.Interfaces;

internal interface IEmailOtpService
{
    Task<Result<string>> GenerateOtpAsync(string userId, CancellationToken cancellationToken = default);
}
