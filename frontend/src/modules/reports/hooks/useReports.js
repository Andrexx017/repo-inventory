import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { exportReport } from '../api/reportsApi';

export const REPORT_TYPES = [
  { value: 'inventory-movements', label: 'Movimientos de inventario' },
  { value: 'sales', label: 'Ventas' },
  { value: 'transfers', label: 'Transferencias' },
];

export const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', extension: 'pdf' },
  { value: 'excel', label: 'Excel', extension: 'xlsx' },
];

function firstDayOfMonthInputValue() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// Convierte un <input type="date"> (solo fecha, sin hora) al rango de horas
// completo del día — si no, "to" a las 00:00:00 dejaría afuera todo lo
// ocurrido ese mismo día (mismo problema que resuelve movementDate en
// useInventory, pero acá aplica a los dos extremos del rango).
function startOfDayIso(dateInputValue) {
  return new Date(`${dateInputValue}T00:00:00`).toISOString();
}

function endOfDayIso(dateInputValue) {
  return new Date(`${dateInputValue}T23:59:59.999`).toISOString();
}

export function useReports() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');

  const [type, setType] = useState(REPORT_TYPES[0].value);
  const [format, setFormat] = useState(REPORT_FORMATS[0].value);
  const [from, setFrom] = useState(firstDayOfMonthInputValue());
  const [to, setTo] = useState(todayInputValue());

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const canMutate = isGeneralAdmin || (!!branchId && String(user?.branchId) === String(branchId));

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

    exporting,
    error,
    handleExport,
  };
}
