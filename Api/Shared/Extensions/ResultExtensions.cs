using Api.Shared.Abstraction;
using Microsoft.AspNetCore.Mvc;

namespace Api.Shared.Extensions;

public static class ResultExtensions
{
    public static IResult ToResponse(this Result result, int code = StatusCodes.Status200OK)
    {
        if (result.IsSuccess)
            return Results.StatusCode(code);

        return ToErrorResponse(result.Error!);
    }

    public static IResult ToResponse<T>(
        this Result<T> result,
        int successStatusCode = StatusCodes.Status200OK)
    {
        if (result.IsSuccess)
        {
            return successStatusCode switch
            {
                StatusCodes.Status200OK =>
                    Results.Ok(result.Value),

                StatusCodes.Status201Created =>
                    Results.Json(
                        result.Value,
                        statusCode: StatusCodes.Status201Created),

                _ => Results.Json(
                    result.Value,
                    statusCode: successStatusCode)
            };
        }

        return ToErrorResponse(result.Error!);
    }

    private static IResult ToErrorResponse(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorType.Validation =>
                StatusCodes.Status400BadRequest,

            ErrorType.Unauthorized =>
                StatusCodes.Status401Unauthorized,

            ErrorType.Forbidden =>
                StatusCodes.Status403Forbidden,

            ErrorType.NotFound =>
                StatusCodes.Status404NotFound,

            ErrorType.Conflict =>
                StatusCodes.Status409Conflict,

            ErrorType.InternalServerError =>
                StatusCodes.Status500InternalServerError,

            _ => StatusCodes.Status500InternalServerError
        };

        var details = new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(error.Type),
            Detail = error.Message
        };

        details.Extensions["code"] = error.Code;
        details.Extensions["errors"] = error.Errors;

        return Results.Problem(
            statusCode: statusCode,
            title: details.Title,
            detail: details.Detail,
            extensions: details.Extensions);
    }

    private static string GetTitle(ErrorType type)
    {
        return type switch
        {
            ErrorType.Validation => "Validation failed",
            ErrorType.Unauthorized => "Unauthorized",
            ErrorType.Forbidden => "Forbidden",
            ErrorType.NotFound => "Not found",
            ErrorType.Conflict => "Conflict",
            ErrorType.InternalServerError => "Internal server error",
            _ => "Request failed"
        };
    }
}
