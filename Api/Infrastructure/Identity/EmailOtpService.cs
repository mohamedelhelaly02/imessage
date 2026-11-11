using Api.Application.Features.Auth;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Infrastructure.Persistence;
using Api.Shared.Abstraction;
using Api.Shared.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace Api.Infrastructure.Identity;

internal sealed class EmailOtpService : IEmailOtpService
{
    private readonly OtpSettings _otpSettings;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<EmailOtpService> _logger;

    public EmailOtpService(
        IOptions<OtpSettings> otpOptions,
        AppDbContext dbContext,
        ILogger<EmailOtpService> logger)
    {
        _otpSettings = otpOptions.Value;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<Result<string>> GenerateOtpAsync(string userId, CancellationToken cancellationToken = default)
    {
        var code = GenerateRandomOtp();
        var hashedCode = GetHashedCode(code);
        var now = DateTime.UtcNow;

        using var transaction = await _dbContext.Database
            .BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var userExists = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (userExists == null)
            return Result<string>.Failure(UserErrors.UserNotFound);

        var previousOtps = await _dbContext.EmailConfirmationOtps
            .Where(x => x.UserId == userId && x.ConsumedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var otp in previousOtps)
            otp.ConsumedAtUtc = now;

        var newOtp = new EmailConfirmationOtp
        {
            UserId = userId,
            CodeHash = hashedCode,
            FailedAttempts = 0,
            ExpiresAtUtc = now.AddMinutes(_otpSettings.ExpirationMinutes),
            CreatedAtUtc = now
        };

        await _dbContext.EmailConfirmationOtps.AddAsync(newOtp, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return Result<string>.Success(code);
    }

    public async Task<Result<bool>> VerifyAndConfirmEmailAsync(
        string userId,
        string code,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

        if (user is null)
            return Result<bool>.Failure(UserErrors.InvalidEmailConfirmationOtp);

        if (user.EmailConfirmed)
            return Result<bool>.Success(true);

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var otp = await _dbContext.EmailConfirmationOtps
            .Where(x => x.UserId == userId && x.ConsumedAtUtc == null)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (otp is null)
            return Result<bool>.Failure(UserErrors.InvalidEmailConfirmationOtp);

        var now = DateTime.UtcNow;
        if (otp.ExpiresAtUtc <= now || otp.FailedAttempts >= _otpSettings.MaxFailedAttempts)
        {
            otp.ConsumedAtUtc = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return Result<bool>.Failure(UserErrors.InvalidEmailConfirmationOtp);
        }

        var expectedHash = Convert.FromHexString(otp.CodeHash);
        var providedHash = Convert.FromHexString(GetHashedCode(code));

        if (!CryptographicOperations.FixedTimeEquals(expectedHash, providedHash))
        {
            otp.FailedAttempts++;
            if (otp.FailedAttempts >= _otpSettings.MaxFailedAttempts)
                otp.ConsumedAtUtc = now;

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return Result<bool>.Failure(UserErrors.InvalidEmailConfirmationOtp);
        }

        otp.ConsumedAtUtc = now;
        user.EmailConfirmed = true;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    private string GetHashedCode(string code)
    {
        var secretKey = Convert.FromBase64String(_otpSettings.Secret);
        var hash = HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(code));
        return Convert.ToHexString(hash);
    }

    private static string GenerateRandomOtp()
        => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}
