using static Api.Application.Features.Auth.Register;

namespace Api.Application.Features.Auth.Email;

internal interface IEmailConfirmationStrategyResolver
{
    IEmailConfirmationStrategy Resolve(ClientType clientType);
}
