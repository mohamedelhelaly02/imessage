namespace Api.Shared.Helpers;

public static class CookieHelper
{
    private const string CookieName = "refresh_token";
    public static void SetRefreshTokenCookie(
        HttpResponse response,
        string refreshToken,
        DateTime expires)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            Expires = expires,
            SameSite = SameSiteMode.Strict
        };

        response.Cookies.Append(CookieName, refreshToken, cookieOptions);
    }

    public static void DeleteRefreshTokenCookie(HttpResponse response)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict
        };

        response.Cookies.Delete(CookieName, cookieOptions);
    }

    public static string? GetRefreshTokenCookie(HttpRequest httpRequest) => httpRequest.Cookies[CookieName];
}
