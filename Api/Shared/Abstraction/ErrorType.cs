namespace Api.Shared.Abstraction;

public enum ErrorType
{
    NotFound,
    Validation,
    Unauthorized,
    Forbidden,
    Conflict,
    InternalServerError
}
