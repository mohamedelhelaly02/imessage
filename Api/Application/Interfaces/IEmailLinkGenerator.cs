namespace Api.Application.Interfaces;

public interface IEmailLinkGenerator
{
    string GenerateConfirmEmailLink(string encodedEmail, string encodedToken);
    string GenerateResetPasswordLink(string encodedEmail, string encodedToken);
}
