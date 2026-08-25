using Inventory.Shared.Exceptions;

namespace Inventory.Shared.Middleware;

// Manejo global de errores: traduce excepciones de negocio a respuestas HTTP
// consistentes (ProblemDetails) y evita duplicar try/catch en cada Controller.
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            await WriteProblemAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (ConflictException ex)
        {
            await WriteProblemAsync(context, StatusCodes.Status409Conflict, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción no controlada");
            await WriteProblemAsync(context, StatusCodes.Status500InternalServerError, "Ocurrió un error inesperado.");
        }
    }

    private static Task WriteProblemAsync(HttpContext context, int statusCode, string detail)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(new { status = statusCode, title = detail });
    }
}
