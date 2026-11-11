using static Api.Application.Features.Auth.Register;

namespace Api.Application.Features.Auth.Email;

internal sealed class EmailConfirmationStrategyResolver : IEmailConfirmationStrategyResolver
{
    private readonly IEnumerable<IEmailConfirmationStrategy> _strategies;

    public EmailConfirmationStrategyResolver(
        IEnumerable<IEmailConfirmationStrategy> strategies) => _strategies = strategies;

    public IEmailConfirmationStrategy Resolve(ClientType clientType)
    {
        return _strategies.FirstOrDefault(x => x.ClientType == clientType)
            ?? throw new NotSupportedException(
                $"Email confirmation strategy for {clientType} is not supported.");
    }
}