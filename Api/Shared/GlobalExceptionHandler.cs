using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Api.Shared;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = exception switch
        {
            ValidationException =>
            (
                StatusCodes.Status400BadRequest,
                "Validation Failed",
                "One or more validation errors occurred."
            ),

            UnauthorizedAccessException =>
            (
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "You are not authorized to access this resource."
            ),

            KeyNotFoundException =>
            (
                StatusCodes.Status404NotFound,
                "Resource Not Found",
                "The requested resource was not found."
            ),

            _ =>
            (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                "An unexpected error occurred. Please try again later."
            )
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(
                exception,
                "Unhandled exception occurred. TraceId: {TraceId}",
                httpContext.TraceIdentifier);
        }
        else
        {
            logger.LogWarning(
                "Request failed with status {StatusCode}. " +
                "Exception: {ExceptionType}. TraceId: {TraceId}",
                statusCode,
                exception.GetType().Name,
                httpContext.TraceIdentifier);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] =
           httpContext.TraceIdentifier;

        if (exception is ValidationException validationException)
        {
            var errors = validationException.Errors
                 .GroupBy(error => error.PropertyName)
                 .ToDictionary(
                     group => group.Key,
                     group => group
                         .Select(error => error.ErrorMessage)
                         .Distinct()
                         .ToArray());

            problemDetails.Extensions["errors"] = errors;
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }

}
