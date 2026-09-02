// Convierte un <input type="date"> (solo fecha, sin hora) al rango de horas
// completo del día — si no, "to" a las 00:00:00 dejaría afuera todo lo
// ocurrido ese mismo día. Mismo criterio en los dos extremos del rango.
// Usado por los filtros de fecha de listados (Inventario, Ventas, Compras,
// Transferencias) y por la exportación de reportes (RF-35).
export function startOfDayIso(dateInputValue) {
  return new Date(`${dateInputValue}T00:00:00`).toISOString();
}

export function endOfDayIso(dateInputValue) {
  return new Date(`${dateInputValue}T23:59:59.999`).toISOString();
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
