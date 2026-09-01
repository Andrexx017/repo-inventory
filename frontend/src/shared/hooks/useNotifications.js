import { useCallback, useEffect, useState } from 'react';
import { getUser } from '../apiClient';
import { getAlerts } from '../../modules/inventory/api/inventoryApi';
import { getTransfers } from '../../modules/transfers/api/transfersApi';

const POLL_MS = 60000;

// Notificaciones de la campana: alertas de stock pendientes (RF-09/RF-34) +
// transferencias en tránsito (RF-27) de la sucursal del usuario logueado —
// nunca de otras sucursales, ni siquiera para el Admin general (que no tiene
// `branchId` propio, así que simplemente no ve notificaciones acá; sí tiene
// visibilidad total desde Inventario/Transferencias/Dashboard).
export function useNotifications() {
  const user = getUser();
  const branchId = user?.branchId ? String(user.branchId) : null;

  const [alerts, setAlerts] = useState([]);
  const [transfersInTransit, setTransfersInTransit] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      const [alertsData, transfersData] = await Promise.all([
        getAlerts(branchId),
        getTransfers(branchId),
      ]);
      setAlerts(alertsData.filter((a) => a.status === 'pending'));
      setTransfersInTransit(transfersData.filter((t) => t.status === 'in_transit'));
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
    ...alerts.map((a) => ({
      id: `alert-${a.id}`,
      title: a.productName,
      subtitle: a.alertType === 'low_stock'
        ? `Stock bajo · ${a.quantityAtTrigger}/${a.thresholdValue}`
        : `Stock alto · ${a.quantityAtTrigger}/${a.thresholdValue}`,
      severity: a.alertType === 'low_stock' ? 'danger' : 'warning',
      to: '/inventory',
    })),
    ...transfersInTransit.map((t) => ({
      id: `transfer-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: `${t.originBranchName} → ${t.destinationBranchName} · en tránsito`,
      severity: 'info',
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
