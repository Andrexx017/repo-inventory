namespace Inventory.Shared.Exceptions;

// Conflicto con el estado ya existente (ej. email ya registrado).
// El middleware global la traduce a 409 Conflict.
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}
