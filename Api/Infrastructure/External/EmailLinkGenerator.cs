using Api.Application.Interfaces;

namespace Api.Infrastructure.External;

public sealed class EmailLinkGenerator(IConfiguration configuration) : IEmailLinkGenerator
{
    private readonly string clientUrl = configuration["AngularClient"]
         ?? throw new KeyNotFoundException("clientUrl is not configured");

    public string GenerateConfirmEmailLink(string encodedEmail, string encodedToken)
        => $"{clientUrl}/auth/confirm-email?email={encodedEmail}&token={encodedToken}";

    public string GenerateResetPasswordLink(string encodedEmail, string encodedToken)
        => $"{clientUrl}/auth/reset-password?email={encodedEmail}&token={encodedToken}";

}
