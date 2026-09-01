import { useEffect, useState } from 'react';
import { getUser } from '../shared/apiClient';
import { getBranches } from '../modules/auth/api/branchesApi';
import { getAlerts } from '../modules/inventory/api/inventoryApi';
import { getPurchaseOrders } from '../modules/purchases/api/purchaseOrdersApi';
import { getSales } from '../modules/sales/api/salesApi';

function isSameMonth(dateValue, reference) {
  const d = new Date(dateValue);
  return d.getMonth() === reference.getMonth() && d.getFullYear() === reference.getFullYear();
}

// Mismo semáforo que useInventory.js (sección 2.14), pero sobre StockAlertDto
// (quantityAtTrigger/thresholdValue) en vez de InventoryItemDto — son formas
// distintas de la misma regla: "por debajo de la mitad del mínimo" es crítico.
function alertSeverity(alert) {
  return alert.quantityAtTrigger <= alert.thresholdValue * 0.5 ? 'critico' : 'bajo';
}

export function useHomeDashboard() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [branches, setBranches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    let currentBranchId = branchId;

    // Siempre se cargan las sucursales (no solo para general_admin): además
    // de armarle un valor por defecto al admin (que no tiene sucursal propia,
    // igual criterio que useInventory.js/usePurchases.js), es lo que le
    // permite a Home.jsx mostrar el nombre real de la sucursal de cualquier
    // usuario en vez de un "Sucursal #id" genérico.
    try {
      const branchesData = await getBranches();
      setBranches(branchesData);

      if (isGeneralAdmin && !currentBranchId && branchesData.length > 0) {
        currentBranchId = String(branchesData[0].id);
        setBranchId(currentBranchId);
      }
    } catch {
      // Sin sucursales no hay nada que mostrar — se deja el dashboard en blanco.
    }

    if (!currentBranchId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // allSettled, no all: cada tarjeta se apaga sola si su módulo falla (por
    // ejemplo, un rol sin acceso a Ventas todavía) en vez de tumbar el resto
    // del panel — el Home es un resumen, no una pantalla que dependa de que
    // los tres módulos respondan siempre.
    const [alertsResult, ordersResult, salesResult] = await Promise.allSettled([
      getAlerts(currentBranchId),
      getPurchaseOrders(currentBranchId),
      getSales(currentBranchId),
    ]);

    setAlerts(alertsResult.status === 'fulfilled' ? alertsResult.value : []);
    setPurchaseOrders(ordersResult.status === 'fulfilled' ? ordersResult.value : []);
    setSales(salesResult.status === 'fulfilled' ? salesResult.value : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [branchId]);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  const activePurchaseOrders = purchaseOrders.filter(
    (o) => !['fully_received', 'cancelled'].includes(o.status)
  );

  const monthSales = sales.filter((s) => isSameMonth(s.saleDate, now));
  const salesToday = sales.filter((s) => s.saleDate.slice(0, 10) === today);
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const unitsToday = salesToday.reduce(
    (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  const quantityByProduct = {};
  monthSales.forEach((sale) => {
    sale.items.forEach((item) => {
      quantityByProduct[item.productName] = (quantityByProduct[item.productName] || 0) + item.quantity;
    });
  });
  const topProductEntry = Object.entries(quantityByProduct).sort((a, b) => b[1] - a[1])[0];

  return {
    loading,
    branches,
    branchId,
    pendingAlerts: pendingAlerts.map((a) => ({ ...a, severity: alertSeverity(a) })),
    activeOrdersCount: activePurchaseOrders.length,
    monthTotal,
    monthSalesCount: monthSales.length,
    unitsToday,
    topProductName: topProductEntry ? topProductEntry[0] : null,
    topProductQuantity: topProductEntry ? topProductEntry[1] : 0,
  };
}
