namespace Api.Shared.Abstraction;

public sealed record Error
{
    public string Code { get; }
    public string? Message { get; }
    public ErrorType Type { get; }
    public Dictionary<string, string[]>? Errors { get; } = [];
    private Error(string code, string? message, ErrorType type, Dictionary<string, string[]>? errors = null)
    {
        Code = code;
        Message = message;
        Type = type;
        Errors = errors;
    }

    public static Error Unauthorized(string code = "UNAUTHORIZED", string message = "Unauthorized access.") => new(code, message, ErrorType.Unauthorized);
    public static Error Forbidden(string code = "FORBIDDEN", string message = "You are not allowed to perform this operation.") => new(code, message, ErrorType.Forbidden);
    public static Error NotFound(string code = "NOT_FOUND", string message = "Resource not found.") => new(code, message, ErrorType.NotFound);
    public static Error Conflict(string code = "CONFLICT", string message = "Conflict occurred.") => new(code, message, ErrorType.Conflict);
    public static Error Validation(
        string code = "VALIDATION",
        string? message = null,
        Dictionary<string, string[]>? errors = null)
            => new(code, message, ErrorType.Validation, errors);

    public static Error Failure(string message = "An internal error occurred.") => new("FAILURE", message, ErrorType.InternalServerError);

}
