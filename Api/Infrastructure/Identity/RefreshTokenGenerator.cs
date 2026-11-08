using System.Security.Cryptography;

namespace Api.Infrastructure.Identity;

public static class RefreshTokenGenerator
{
    public static string GenerateToken()
    {
        RandomNumberGenerator rng = RandomNumberGenerator.Create();
        byte[] randomBytes = new byte[64];
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
