import { useEffect, useState } from 'react';
import { getUser } from '../shared/apiClient';
import { getBranches } from '../modules/auth/api/branchesApi';
import { getAlerts, getInventoryByBranch } from '../modules/inventory/api/inventoryApi';
import { stockStatus } from '../modules/inventory/hooks/useInventory';
import { getPurchaseOrdersKpiSummary } from '../modules/purchases/api/purchaseOrdersApi';
import { getSalesKpiSummary } from '../modules/sales/api/salesApi';

export function useHomeDashboard() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [branches, setBranches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [items, setItems] = useState([]);
  const [purchaseOrdersKpi, setPurchaseOrdersKpi] = useState(null);
  const [salesKpi, setSalesKpi] = useState(null);
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
    // los tres módulos respondan siempre. Se piden los KPI agregados (no la
    // lista completa) — mismo endpoint que ya usan las pantallas de
    // Ventas/Compras para sus propias tarjetas de encabezado.
    const [alertsResult, itemsResult, ordersKpiResult, salesKpiResult] = await Promise.allSettled([
      getAlerts(currentBranchId),
      getInventoryByBranch(currentBranchId),
      getPurchaseOrdersKpiSummary(currentBranchId),
      getSalesKpiSummary(currentBranchId),
    ]);

    setAlerts(alertsResult.status === 'fulfilled' ? alertsResult.value : []);
    setItems(itemsResult.status === 'fulfilled' ? itemsResult.value : []);
    setPurchaseOrdersKpi(ordersKpiResult.status === 'fulfilled' ? ordersKpiResult.value : null);
    setSalesKpi(salesKpiResult.status === 'fulfilled' ? salesKpiResult.value : null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [branchId]);

  // Las alertas guardan quantityAtTrigger/thresholdValue como una FOTO del
  // momento en que se dispararon (columna de auditoría) — si el stock siguió
  // bajando después (ej. otra venta) sin que la alerta se resolviera y
  // volviera a disparar, esos valores quedan desactualizados. Se cruza cada
  // alerta con su InventoryItemDto real (currentQuantity/minimumStock) para
  // mostrar y clasificar (stockStatus, mismo semáforo que useInventory.js)
  // el stock vigente, no el de cuando se creó la alerta.
  const pendingAlerts = alerts
    .filter((a) => a.status === 'pending')
    .map((a) => {
      const item = items.find((i) => i.productId === a.productId);
      const currentQuantity = item ? item.currentQuantity : a.quantityAtTrigger;
      const liveThreshold = a.alertType === 'low_stock' ? item?.minimumStock : item?.maximumStock;
      const minimumStock = liveThreshold ?? a.thresholdValue;
      const status = item ? stockStatus(item) : null;
      return {
        ...a,
        currentQuantity,
        minimumStock,
        severity: status === 'critico' ? 'critico' : 'bajo',
      };
    });
  return {
    loading,
    branches,
    branchId,
    pendingAlerts,
    activeOrdersCount: purchaseOrdersKpi?.activeOrders ?? 0,
    monthTotal: salesKpi?.monthTotal ?? 0,
    monthSalesCount: salesKpi?.salesThisMonth ?? 0,
    unitsToday: salesKpi?.unitsToday ?? 0,
    topProductName: salesKpi?.topProductName ?? null,
    topProductQuantity: salesKpi?.topProductUnits ?? 0,
  };
}
