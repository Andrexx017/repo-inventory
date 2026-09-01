import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import {
  getSalesSummary,
  getInventoryRotation,
  getActiveTransfers,
  getLowStockIndicators,
  getBranchComparison,
} from '../api/dashboardApi';

export const MONTH_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Mismo criterio "por debajo de la mitad del mínimo = crítico" que ya usan
// stockStatus() en useInventory.js y alertSeverity() en useHomeDashboard.js —
// LowStockIndicatorDto no trae un campo de severidad propio, se deriva acá.
export function lowStockSeverity(item) {
  return item.currentQuantity <= item.minimumStock * 0.5 ? 'critico' : 'bajo';
}

export function deficitPercent(item) {
  if (item.minimumStock <= 0) return 0;
  const pct = ((item.minimumStock - item.currentQuantity) / item.minimumStock) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function useDashboard() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');

  const [salesSummary, setSalesSummary] = useState(null);
  const [inventoryRotation, setInventoryRotation] = useState(null);
  const [activeTransfers, setActiveTransfers] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [branchComparison, setBranchComparison] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [restockItem, setRestockItem] = useState(null);
  const [branchDetail, setBranchDetail] = useState(null);
  const [branchDetailLoading, setBranchDetailLoading] = useState(false);

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

  async function loadDashboard() {
    if (!branchId) return;

    setLoading(true);

    // allSettled: mismo criterio que useHomeDashboard.js — cada tarjeta se
    // apaga sola si su endpoint falla, en vez de tumbar el panel completo.
    const [salesResult, rotationResult, transfersResult, lowStockResult] = await Promise.allSettled([
      getSalesSummary(branchId),
      getInventoryRotation(branchId),
      getActiveTransfers(branchId),
      getLowStockIndicators(branchId),
    ]);

    setSalesSummary(salesResult.status === 'fulfilled' ? salesResult.value : null);
    setInventoryRotation(rotationResult.status === 'fulfilled' ? rotationResult.value : null);
    setActiveTransfers(transfersResult.status === 'fulfilled' ? transfersResult.value : null);
    setLowStock(lowStockResult.status === 'fulfilled' ? lowStockResult.value : null);
    setLoading(false);
  }

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // RF-33: no depende de branchId — se carga una sola vez, y solo para
  // general_admin (el resto de roles ni tiene el endpoint disponible).
  useEffect(() => {
    if (!isGeneralAdmin) return;

    getBranchComparison()
      .then(setBranchComparison)
      .catch(() => setBranchComparison(null));
  }, [isGeneralAdmin]);

  function openRestockModal(item) {
    setRestockItem(item);
  }

  function closeRestockModal() {
    setRestockItem(null);
  }

  // El modal ya no registra el ingreso él mismo — solo redirige a Inventario
  // (RF-07/RF-09, el módulo dueño de esa acción) con la sucursal y el producto
  // de la alerta ya preseleccionados, para no perder el contexto del clic.
  function goToInventoryForRestock() {
    if (!restockItem) return;

    navigate('/inventory', {
      state: { branchId: Number(branchId), productId: restockItem.productId },
    });
  }

  async function openBranchDetail(branch) {
    setBranchDetail({ ...branch, monthlyHistory: null });
    setBranchDetailLoading(true);

    try {
      const summary = await getSalesSummary(branch.branchId);
      setBranchDetail({ ...branch, monthlyHistory: summary.monthlyHistory });
    } catch {
      setBranchDetail({ ...branch, monthlyHistory: [] });
    } finally {
      setBranchDetailLoading(false);
    }
  }

  function closeBranchDetail() {
    setBranchDetail(null);
  }

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,

    salesSummary,
    inventoryRotation,
    activeTransfers,
    lowStock,
    branchComparison,

    loading,
    error,

    restockItem,
    openRestockModal,
    closeRestockModal,
    goToInventoryForRestock,

    branchDetail,
    branchDetailLoading,
    openBranchDetail,
    closeBranchDetail,
  };
}
