import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { startOfDayIso, endOfDayIso, todayInputValue } from '../../../shared/dateRange';
import { exportReport } from '../api/reportsApi';
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
  { value: 'excel', label: 'Excel', extension: 'xlsx' },
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

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

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
        setError(err.message || 'No se pudieron cargar las sucursales.');
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

  async function handleExport(e) {
    e.preventDefault();
    setError('');

    if (to < from) {
      setError("La fecha 'hasta' no puede ser anterior a la fecha 'desde'.");
      return;
    }

    setExporting(true);
    try {
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
    } catch (err) {
      setError(err.message || 'No se pudo generar el reporte.');
    } finally {
      setExporting(false);
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

    exporting,
    error,
    handleExport,

    previewItems,
    previewTotalCount,
    previewLoading,
    previewError,
  };
}
