using System.Security.Cryptography;
using System.Text;

namespace Api.Infrastructure.Identity;

public static class RefreshTokenHasher
{
    public static string Hash(string token)
    {
        byte[] tokenBytes = Encoding.UTF8.GetBytes(token);
        byte[] hashBytes = SHA256.HashData(tokenBytes);
        return Convert.ToHexString(hashBytes);
    }
}
