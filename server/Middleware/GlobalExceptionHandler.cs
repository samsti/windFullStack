using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace WindTurbineApi.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var (status, title) = exception switch
        {
            ArgumentException   => (StatusCodes.Status400BadRequest,          "Bad Request"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden,   "Forbidden"),
            KeyNotFoundException => (StatusCodes.Status404NotFound,           "Not Found"),
            _                   => (StatusCodes.Status500InternalServerError, "Internal Server Error"),
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title  = title,
            Detail = exception.Message,
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
