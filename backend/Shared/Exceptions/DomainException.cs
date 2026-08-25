namespace Inventory.Shared.Exceptions;

// Violación de una regla de negocio (ej. rol sin sucursal cuando la requiere).
// El middleware global la traduce a 400 Bad Request.
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }
}
