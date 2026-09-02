import { useCallback, useEffect, useState } from 'react';
import { getUser } from '../apiClient';
import { getAlerts, getInventoryByBranch } from '../../modules/inventory/api/inventoryApi';
import { getTransfers } from '../../modules/transfers/api/transfersApi';

const POLL_MS = 60000;

// Notificaciones de la campana: alertas de stock pendientes (RF-09/RF-34) +
// transferencias en tránsito (RF-27) + transferencias recién solicitadas a
// ESTA sucursal como origen (RF-20 — "notificar a sucursal origen" del
// diagrama de flujo de transferencia) — todo de la sucursal del usuario
// logueado, nunca de otras sucursales, ni siquiera para el Admin general (que
// no tiene `branchId` propio, así que simplemente no ve notificaciones acá;
// sí tiene visibilidad total desde Inventario/Transferencias/Dashboard).
export function useNotifications() {
  const user = getUser();
  const branchId = user?.branchId ? String(user.branchId) : null;

  const [alerts, setAlerts] = useState([]);
  const [items, setItems] = useState([]);
  const [transfersInTransit, setTransfersInTransit] = useState([]);
  const [transfersRequestedAtOrigin, setTransfersRequestedAtOrigin] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      // pageSize grande: la campana necesita TODAS las transferencias en
      // tránsito/solicitadas de la sucursal para no perder notificaciones,
      // no solo una página — getTransfers ahora devuelve {items, totalCount}.
      const [alertsData, itemsData, transfersPage] = await Promise.all([
        getAlerts(branchId),
        getInventoryByBranch(branchId),
        getTransfers(branchId, { pageSize: 1000 }),
      ]);
      const transfersData = transfersPage.items;
      setAlerts(alertsData.filter((a) => a.status === 'pending'));
      setItems(itemsData);
      setTransfersInTransit(transfersData.filter((t) => t.status === 'in_transit'));
      setTransfersRequestedAtOrigin(transfersData.filter((t) =>
        t.status === 'requested' && String(t.originBranchId) === branchId));
    } catch {
      // Las notificaciones son un complemento — un fallo acá no debe romper
      // el resto de la pantalla, se reintenta en el próximo poll.
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const notifications = [
    // quantityAtTrigger/thresholdValue son una foto de cuando se disparó la
    // alerta (columna de auditoría) — si el stock siguió moviéndose después
    // (ej. otra venta) sin que la alerta se resolviera y volviera a
    // disparar, esos valores quedan viejos. Se cruza con el inventario real
    // (currentQuantity/minimumStock) para mostrar el stock vigente.
    ...alerts.map((a) => {
      const item = items.find((i) => i.productId === a.productId);
      const currentQuantity = item ? item.currentQuantity : a.quantityAtTrigger;
      const liveThreshold = a.alertType === 'low_stock' ? item?.minimumStock : item?.maximumStock;
      const threshold = liveThreshold ?? a.thresholdValue;
      return {
        id: `alert-${a.id}`,
        title: a.productName,
        subtitle: a.alertType === 'low_stock'
          ? `Stock bajo · ${currentQuantity}/${threshold}`
          : `Stock alto · ${currentQuantity}/${threshold}`,
        severity: a.alertType === 'low_stock' ? 'danger' : 'warning',
        to: '/inventory',
      };
    }),
    ...transfersInTransit.map((t) => ({
      id: `transfer-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: `${t.originBranchName} → ${t.destinationBranchName} · en tránsito`,
      severity: 'info',
      to: '/transfers',
      state: { openTransferId: t.id },
    })),
    ...transfersRequestedAtOrigin.map((t) => ({
      id: `transfer-requested-${t.id}`,
      title: `Transferencia ${t.transferNumber} solicitada`,
      subtitle: `${t.destinationBranchName} la pidió · pendiente de preparar`,
      severity: 'warning',
      to: '/transfers',
      state: { openTransferId: t.id },
    })),
  ];

  return {
    notifications,
    loading,
    hasBranch: Boolean(branchId),
    reload: load,
  };
}
