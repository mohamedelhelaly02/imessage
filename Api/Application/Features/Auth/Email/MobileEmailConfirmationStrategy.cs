using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Abstraction;
using Api.Shared.Helpers;
using Microsoft.Extensions.Options;
using static Api.Application.Features.Auth.Register;

namespace Api.Application.Features.Auth.Email;

internal sealed class MobileEmailConfirmationStrategy : IEmailConfirmationStrategy
{
    public ClientType ClientType => ClientType.Mobile;

    private readonly IEmailOtpService _emailOtpService;
    private readonly IEmailService _emailService;
    private readonly OtpSettings _otpSettings;

    public MobileEmailConfirmationStrategy(
        IEmailOtpService emailOtpService,
        IEmailService emailService,
        IOptions<OtpSettings> options)
    {
        _emailOtpService = emailOtpService;
        _emailService = emailService;
        _otpSettings = options.Value;
    }

    public async Task<Result<bool>> SendConfirmationEmailAsync(
        User user, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(user.Email))
            return Result<bool>.Failure(Error.Unauthorized());

        var otpResult = await _emailOtpService.GenerateOtpAsync(user.Id, cancellationToken);

        if (!otpResult.IsSuccess)
            return Result<bool>.Failure(otpResult.Error!);

        var emailTemplate = $"""
            <p>Please confirm your account using the following code:</p>
            <h2>{otpResult.Value}</h2>
            <p>This code expires in {_otpSettings.ExpirationMinutes} minutes.</p>
            """;

        await _emailService.SendEmailAsync(user.Email, "Confirm your email", emailTemplate);

        return Result<bool>.Success(true);
    }
}