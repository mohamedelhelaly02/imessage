using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Microsoft.AspNetCore.Identity;
using System.Buffers.Text;
using System.Text;
using static Api.Application.Features.Auth.Register;

namespace Api.Application.Features.Auth.Email;

internal sealed class WebEmailConfirmationStrategy : IEmailConfirmationStrategy
{
    public ClientType ClientType => ClientType.Web;
    private readonly UserManager<User> _userManager;
    private readonly IEmailLinkGenerator _emailLinkGenerator;
    private readonly IEmailService _emailService;

    public WebEmailConfirmationStrategy(
        UserManager<User> userManager,
        IEmailLinkGenerator emailLinkGenerator,
        IEmailService emailService)
    {
        _userManager = userManager;
        _emailLinkGenerator = emailLinkGenerator;
        _emailService = emailService;
    }

    public async Task<Result<bool>> SendConfirmationEmailAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(user.Email))
            return Result<bool>.Failure(Error.Unauthorized());

        string token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

        var encodedEmail = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(user.Email!));
        var encodedToken = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(token));

        string confirmationLink = _emailLinkGenerator.GenerateConfirmEmailLink(encodedEmail, encodedToken);

        await _emailService.SendEmailAsync(
            user.Email,
            "Confirm your email",
            $"Please confirm your account by clicking this link: <a href='{confirmationLink}'>confirm email</a>");

        return Result<bool>.Success(true);
    }
}
