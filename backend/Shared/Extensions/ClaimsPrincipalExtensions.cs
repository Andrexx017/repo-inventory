using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Inventory.Shared.Extensions;

public static class ClaimsPrincipalExtensions
{
    // JwtTokenGenerator.cs:28 firma el token con el claim corto "sub", pero
    // AddJwtBearer remapea por defecto claims cortos conocidos a su URI larga
    // equivalente (MapInboundClaims = true) — "sub" termina como
    // ClaimTypes.NameIdentifier en el ClaimsPrincipal ya armado. Se revisan los
    // dos nombres para no depender de esa configuración implícita.
    public static long GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (value is null || !long.TryParse(value, out var userId))
        {
            throw new InvalidOperationException("El token no trae un id de usuario válido.");
        }

        return userId;
    }
}