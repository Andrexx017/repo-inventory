// Bus mínimo para que cualquier mutación (stock, transferencias, compras)
// pueda pedirle a la campana de notificaciones que se refresque de inmediato,
// en vez de esperar al próximo tick del polling (POLL_MS en useNotifications).
const target = new EventTarget();
const EVENT_NAME = 'inventory-data-changed';

export function notifyDataChanged() {
  target.dispatchEvent(new Event(EVENT_NAME));
}

export function onDataChanged(handler) {
  target.addEventListener(EVENT_NAME, handler);
  return () => target.removeEventListener(EVENT_NAME, handler);
}
