using System.Security.Claims;
using Api.Application.Interfaces;

namespace Api.Infrastructure.Identity;

internal sealed class CurrentUser(IHttpContextAccessor accessor) : IUser
{
    public string Id => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
}
