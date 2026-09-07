import { getBlob, postJson } from '../../../shared/apiClient';

// RF-35: GET /api/reports/{branchId}/export?type=&format=&from=&to=. El
// backend arma el archivo entero en la respuesta (Content-Type según el
// formato) — acá solo se pide como Blob, no como JSON.
export function exportReport(branchId, { type, format, from, to }) {
  const query = new URLSearchParams({ type, format, from, to });
  return getBlob(`/api/reports/${branchId}/export?${query.toString()}`);
}

// Envío manual e inmediato ("Enviar por correo ahora") — genera el reporte
// del rango elegido y lo manda por correo una sola vez.
export function sendReportByEmail(branchId, { type, format, from, to, recipientEmails }) {
  return postJson(`/api/reports/${branchId}/send-now`, {
    reportType: type,
    format,
    from,
    to,
    recipientEmails,
  });
}
