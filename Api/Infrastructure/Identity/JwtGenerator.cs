using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Api.Application.Interfaces;
using Api.Domain.Entities;
using Api.Shared.Helpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Api.Infrastructure.Identity;

public sealed class JwtGenerator(
    IOptions<JwtSettings> jwtOptions,
    UserManager<User> userManager) : IJwtGenerator
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();
    public string Generate(User user)
    {
        var userRoles = userManager.GetRolesAsync(user).Result;
        var roleClaims = userRoles.Select(role => new Claim("role", role)).ToList();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Email, user.Email?? string.Empty)
        };

        claims.AddRange(roleClaims);

        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        SigningCredentials creds = new(key, SecurityAlgorithms.HmacSha256);

        SecurityTokenDescriptor tokenDescriptor = new()
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
            SigningCredentials = creds,
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience
        };

        SecurityToken token = _tokenHandler.CreateToken(tokenDescriptor);

        return _tokenHandler.WriteToken(token);
    }
}
