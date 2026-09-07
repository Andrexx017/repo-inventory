import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { startOfDayIso, endOfDayIso, todayInputValue } from '../../../shared/dateRange';
import { exportReport, sendReportByEmail } from '../api/reportsApi';
import { getMovements } from '../../inventory/api/inventoryApi';
import { getSales } from '../../sales/api/salesApi';
import { getTransfers } from '../../transfers/api/transfersApi';

export const REPORT_TYPES = [
  { value: 'inventory-movements', label: 'Movimientos de inventario' },
  { value: 'sales', label: 'Ventas' },
  { value: 'transfers', label: 'Transferencias' },
];

export const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', extension: 'pdf' },
  { value: 'excel', label: 'Excel (.xlsx)', extension: 'xlsx' },
];

// Rangos rápidos sobre los inputs Desde/Hasta — evita tener que picotear el
// date picker para los casos más comunes (cierre del mes, últimos 30 días).
export const QUICK_RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes anterior' },
  { value: 'last-30-days', label: 'Últimos 30 días' },
];

const PREVIEW_PAGE_SIZE = 8;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function firstDayOfMonthInputValue() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function daysAgoInputValue(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function previousMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: firstDay.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10) };
}

// "correo1@x.com; correo2@x.com" o separados por coma — recorta espacios y
// descarta vacíos (ej. un ";" de más al final).
function parseEmails(raw) {
  return raw
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function useReports() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');

  const [type, setType] = useState(REPORT_TYPES[0].value);
  const [format, setFormat] = useState(REPORT_FORMATS[0].value);
  const [from, setFromRaw] = useState(firstDayOfMonthInputValue());
  const [to, setToRaw] = useState(todayInputValue());
  const [activeRange, setActiveRange] = useState('this-month');

  const [recipientEmailsInput, setRecipientEmailsInput] = useState('');

  // "Enviar por correo ahora" — genera el reporte del rango elegido y lo
  // manda ya, sin descargarlo al navegador.
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState('');

  // "Exportar ahora" — solo descarga el archivo, sin correo.
  const [exportingOnly, setExportingOnly] = useState(false);
  const [exportOnlyError, setExportOnlyError] = useState('');

  const [previewItems, setPreviewItems] = useState([]);
  const [previewTotalCount, setPreviewTotalCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const canMutate = isGeneralAdmin || (!!branchId && String(user?.branchId) === String(branchId));

  // Editar Desde/Hasta a mano desarma el chip de rango rápido activo — si no,
  // quedaría un chip resaltado que ya no corresponde al rango real.
  function setFrom(value) {
    setFromRaw(value);
    setActiveRange(null);
  }

  function setTo(value) {
    setToRaw(value);
    setActiveRange(null);
  }

  function applyQuickRange(preset) {
    const today = todayInputValue();
    if (preset === 'today') {
      setFromRaw(today);
      setToRaw(today);
    } else if (preset === 'this-month') {
      setFromRaw(firstDayOfMonthInputValue());
      setToRaw(today);
    } else if (preset === 'last-month') {
      const range = previousMonthRange();
      setFromRaw(range.from);
      setToRaw(range.to);
    } else if (preset === 'last-30-days') {
      setFromRaw(daysAgoInputValue(30));
      setToRaw(today);
    }
    setActiveRange(preset);
  }

  useEffect(() => {
    async function loadBranches() {
      try {
        const branchesData = await getBranches();
        setBranches(branchesData);

        if (!branchId && branchesData.length > 0) {
          setBranchId(String(branchesData[0].id));
        }
      } catch (err) {
        setExportOnlyError(err.message || 'No se pudieron cargar las sucursales.');
      }
    }

    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vista previa: reusa los mismos listados paginados de Inventario/Ventas/
  // Transferencias con el rango de fechas ya elegido, en vez de generar el
  // PDF/Excel real solo para mostrar un adelanto — mismo filtro, una sola
  // página chica (PREVIEW_PAGE_SIZE), sin pedirle nada nuevo al backend.
  useEffect(() => {
    if (!branchId || !canMutate || !from || !to || to < from) {
      setPreviewItems([]);
      setPreviewTotalCount(0);
      setPreviewError('');
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const range = { from: startOfDayIso(from), to: endOfDayIso(to), page: 1, pageSize: PREVIEW_PAGE_SIZE };
        const result = type === 'inventory-movements'
          ? await getMovements(branchId, range)
          : type === 'sales'
            ? await getSales(branchId, range)
            : await getTransfers(branchId, range);

        if (cancelled) return;
        setPreviewItems(result.items);
        setPreviewTotalCount(result.totalCount);
      } catch (err) {
        if (cancelled) return;
        setPreviewItems([]);
        setPreviewTotalCount(0);
        setPreviewError(err.message || 'No se pudo cargar la vista previa.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [branchId, canMutate, type, from, to]);

  async function runExport() {
    const blob = await exportReport(branchId, {
      type,
      format,
      from: startOfDayIso(from),
      to: endOfDayIso(to),
    });

    const branch = branches.find((b) => String(b.id) === branchId);
    const extension = REPORT_FORMATS.find((f) => f.value === format)?.extension || format;
    const fileName = `${type}_${branch?.code || branchId}_${from.replaceAll('-', '')}-${to.replaceAll('-', '')}.${extension}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // "Exportar ahora": solo descarga el archivo del rango elegido, sin
  // destinatarios — para quien solo quiere el PDF/Excel y no le interesa el correo.
  async function handleExportOnly() {
    setExportOnlyError('');

    if (to < from) {
      setExportOnlyError("La fecha 'hasta' no puede ser anterior a la fecha 'desde'.");
      return;
    }

    setExportingOnly(true);
    try {
      await runExport();
    } catch (err) {
      setExportOnlyError(err.message || 'No se pudo generar el reporte.');
    } finally {
      setExportingOnly(false);
    }
  }

  // "Enviar por correo ahora": genera el reporte del rango Desde/Hasta
  // vigente y lo manda ya — no descarga nada en el navegador.
  async function handleSendByEmail() {
    setSendEmailError('');
    setSendEmailSuccess('');

    if (to < from) {
      setSendEmailError("La fecha 'hasta' no puede ser anterior a la fecha 'desde'.");
      return;
    }

    const emails = parseEmails(recipientEmailsInput);
    if (emails.length === 0) {
      setSendEmailError('Indicá al menos un correo destinatario.');
      return;
    }

    const invalidEmail = emails.find((email) => !EMAIL_REGEX.test(email));
    if (invalidEmail) {
      setSendEmailError(`El correo '${invalidEmail}' no es válido.`);
      return;
    }

    setSendingEmail(true);
    try {
      const result = await sendReportByEmail(branchId, {
        type,
        format,
        from: startOfDayIso(from),
        to: endOfDayIso(to),
        recipientEmails: emails,
      });
      const sentCount = result?.sentCount ?? emails.length;
      setSendEmailSuccess(`Reporte enviado por correo a ${sentCount} destinatario${sentCount === 1 ? '' : 's'}.`);
    } catch (err) {
      setSendEmailError(err.message || 'No se pudo enviar el reporte por correo.');
    } finally {
      setSendingEmail(false);
    }
  }

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canMutate,

    type,
    setType,
    format,
    setFormat,
    from,
    setFrom,
    to,
    setTo,
    activeRange,
    applyQuickRange,

    exportingOnly,
    exportOnlyError,
    handleExportOnly,

    recipientEmailsInput,
    setRecipientEmailsInput,
    sendingEmail,
    sendEmailError,
    sendEmailSuccess,
    handleSendByEmail,

    previewItems,
    previewTotalCount,
    previewLoading,
    previewError,
  };
}
