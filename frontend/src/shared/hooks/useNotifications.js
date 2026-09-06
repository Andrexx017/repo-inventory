import { useCallback, useEffect, useRef, useState } from 'react';
import { getUser } from '../apiClient';
import { getAlerts, getInventoryByBranch } from '../../modules/inventory/api/inventoryApi';
import { getTransfers } from '../../modules/transfers/api/transfersApi';
import { getPurchaseOrders } from '../../modules/purchases/api/purchaseOrdersApi';

// "Casi en tiempo real" a pedido explícito del usuario: no hay push real
// (no hay WebSockets/SignalR en el proyecto), así que esto sigue siendo
// polling — 5s es lo más cerca que se puede llegar sin esa infraestructura.
const POLL_MS = 5000;
// Ventana de "recién decidida" para la orden de compra que el Operador creó —
// pasado este tiempo deja de aparecer en la campana (no se acumulan decisiones
// viejas indefinidamente), aunque el pedido siga confirmado/cancelado en Compras.
const DECIDED_ORDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// v2: el significado de algunos ids cambió durante esta misma sesión de
// pruebas (ej. transfer-requested-<id> antes salía apenas se solicitaba, hoy
// solo cuando ya está aprobada) — un id marcado "visto" bajo el significado
// viejo bloqueaba el toast del evento nuevo aunque nunca se hubiera mostrado
// para esa versión del criterio. Cambiar la clave resetea esa memoria una
// sola vez para todos los navegadores.
const TOASTED_IDS_KEY = 'toastedNotificationIds_v2';
const MAX_TOASTED_IDS = 300;

function loadToastedIds() {
  try {
    const raw = localStorage.getItem(TOASTED_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveToastedIds(ids) {
  try {
    localStorage.setItem(TOASTED_IDS_KEY, JSON.stringify(Array.from(ids).slice(-MAX_TOASTED_IDS)));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — no es crítico,
    // en el peor caso se repite un toast ya visto.
  }
}

// Notificaciones de la campana: alertas de stock pendientes (RF-09/RF-34) +
// todo el ciclo de vida de una transferencia (RF-20 a RF-24: solicitada →
// esperando aprobación del Gerente destino → aprobada/denegada → en tránsito
// → recibida) + órdenes de compra propias que un Gerente acaba de cancelar —
// todo de la sucursal del usuario logueado, nunca de otras sucursales, ni
// siquiera para el Admin general (que no tiene `branchId` propio, así que
// simplemente no ve notificaciones acá; sí tiene visibilidad total desde
// Inventario/Transferencias/Compras/Dashboard).
export function useNotifications() {
  const user = getUser();
  const branchId = user?.branchId ? String(user.branchId) : null;
  // Mismo criterio que canApproveTransfer en useTransfers.js.
  const canApproveTransfer = user?.role === 'branch_manager' || user?.role === 'general_admin';

  const [alerts, setAlerts] = useState([]);
  const [items, setItems] = useState([]);
  const [transfersPendingApproval, setTransfersPendingApproval] = useState([]);
  const [transfersInTransit, setTransfersInTransit] = useState([]);
  const [transfersRequestedAtOrigin, setTransfersRequestedAtOrigin] = useState([]);
  const [transfersDeniedOrCancelled, setTransfersDeniedOrCancelled] = useState([]);
  const [transfersCancelledByOrigin, setTransfersCancelledByOrigin] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  // En un Set en vez de estado de React: no necesita re-renderizar nada por sí
  // solo, y persiste en localStorage para no repetir un toast ya mostrado
  // cuando NotificationBell se remonta (pasa en cada navegación entre
  // pantallas, porque AppShell se renderiza por página, no una sola vez).
  const toastedIdsRef = useRef(loadToastedIds());

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      // pageSize grande: la campana necesita TODAS las transferencias/órdenes
      // de la sucursal para no perder notificaciones, no solo una página —
      // getTransfers/getPurchaseOrders devuelven {items, totalCount}.
      const [alertsData, itemsData, transfersPage, ordersPage] = await Promise.all([
        getAlerts(branchId),
        getInventoryByBranch(branchId),
        getTransfers(branchId, { pageSize: 1000 }),
        getPurchaseOrders(branchId, { pageSize: 1000 }),
      ]);
      const transfersData = transfersPage.items;
      const ordersData = ordersPage.items;
      const now = Date.now();

      setAlerts(alertsData.filter((a) => a.status === 'pending'));
      setItems(itemsData);

      // 1) Operador solicita → el Gerente (+Admin) DESTINO es el primero en
      // enterarse, porque es quien tiene que aprobar o denegar.
      setTransfersPendingApproval(
        canApproveTransfer
          ? transfersData.filter((t) =>
              t.status === 'requested' && !t.approvedAt && String(t.destinationBranchId) === branchId)
          : []
      );

      // 2) Recién aprobada (no antes) → ahora sí le toca a la sucursal
      // ORIGEN prepararla. Antes de aprobar, origen no puede hacer nada
      // igual, así que notificarlo antes solo sería ruido.
      setTransfersRequestedAtOrigin(transfersData.filter((t) =>
        t.status === 'requested' && Boolean(t.approvedAt) && String(t.originBranchId) === branchId));

      setTransfersInTransit(transfersData.filter((t) => t.status === 'in_transit'));

      // 3) Denegada (nunca se aprobó) o cancelada ya aprobada → quien la
      // solicitó (requestedBy) es quien necesita saberlo, no el Gerente que
      // la canceló. Acotado por antigüedad, mismo criterio que las órdenes
      // de compra canceladas.
      setTransfersDeniedOrCancelled(
        user?.id
          ? transfersData.filter((t) =>
              t.requestedBy === user.id &&
              t.status === 'cancelled' &&
              t.cancelledAt &&
              now - new Date(t.cancelledAt).getTime() < DECIDED_ORDER_WINDOW_MS)
          : []
      );

      // 4) Si ya estaba aprobada (approvedAt) y terminó 'cancelled', la única
      // forma de llegar ahí es que el ORIGEN la haya cancelado durante la
      // preparación (canCancel) — el destino no tiene ninguna acción de
      // cancelar una vez aprobada, solo "Denegar" antes de aprobar. El
      // Gerente (+Admin) destino aprobó esa transferencia, así que también
      // necesita enterarse de que se cayó, no solo quien la solicitó.
      setTransfersCancelledByOrigin(
        canApproveTransfer
          ? transfersData.filter((t) =>
              t.status === 'cancelled' &&
              Boolean(t.approvedAt) &&
              t.cancelledAt &&
              String(t.destinationBranchId) === branchId &&
              now - new Date(t.cancelledAt).getTime() < DECIDED_ORDER_WINDOW_MS)
          : []
      );

      // El Operador no necesita aprobación para crear una orden (nace
      // 'confirmed' directo, ver PurchaseOrderService.CreateAsync) — lo único
      // que le queda por saber es si un Gerente canceló una orden suya.
      setCancelledOrders(
        user?.id
          ? ordersData.filter((o) =>
              o.createdBy === user.id &&
              o.status === 'cancelled' &&
              o.decidedAt &&
              now - new Date(o.decidedAt).getTime() < DECIDED_ORDER_WINDOW_MS)
          : []
      );
    } catch {
      // Las notificaciones son un complemento — un fallo acá no debe romper
      // el resto de la pantalla, se reintenta en el próximo poll.
    } finally {
      setLoading(false);
    }
  }, [branchId, user?.id, canApproveTransfer]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // `toastable`: además de aparecer en la campana, dispara la notificación
  // flotante (ToastStack) la primera vez que se ve — el `id` de cada item ya
  // es estable (alert-<id>, transfer-<id>, po-cancelled-<id>), así que el
  // toast sale una sola vez por evento real, no en cada poll (POLL_MS).
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
        toastable: true,
      };
    }),
    ...transfersPendingApproval.map((t) => ({
      id: `transfer-pending-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: `${t.originBranchName} → ${t.destinationBranchName} · esperando tu aprobación`,
      severity: 'warning',
      to: '/transfers',
      state: { openTransferId: t.id },
      toastable: true,
    })),
    ...transfersInTransit.map((t) => ({
      id: `transfer-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: `${t.originBranchName} → ${t.destinationBranchName} · en tránsito`,
      severity: 'info',
      to: '/transfers',
      state: { openTransferId: t.id },
      toastable: true,
    })),
    ...transfersRequestedAtOrigin.map((t) => ({
      id: `transfer-requested-${t.id}`,
      title: `Transferencia ${t.transferNumber} solicitada`,
      subtitle: `${t.destinationBranchName} la pidió · pendiente de preparar`,
      severity: 'warning',
      to: '/transfers',
      state: { openTransferId: t.id },
      toastable: true,
    })),
    ...transfersDeniedOrCancelled.map((t) => ({
      id: `transfer-denied-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: t.approvedAt
        ? `${t.originBranchName} → ${t.destinationBranchName} · fue cancelada`
        : `${t.originBranchName} → ${t.destinationBranchName} · fue denegada`,
      severity: 'danger',
      to: '/transfers',
      state: { openTransferId: t.id },
      toastable: true,
    })),
    ...transfersCancelledByOrigin.map((t) => ({
      id: `transfer-cancelled-origin-${t.id}`,
      title: `Transferencia ${t.transferNumber}`,
      subtitle: `${t.originBranchName} → ${t.destinationBranchName} · el origen la canceló`,
      severity: 'danger',
      to: '/transfers',
      state: { openTransferId: t.id },
      toastable: true,
    })),
    ...cancelledOrders.map((o) => ({
      id: `po-cancelled-${o.id}`,
      title: `Orden de compra ${o.orderNumber}`,
      subtitle: `${o.supplierName} · fue cancelada`,
      severity: 'danger',
      to: '/purchases',
      toastable: true,
    })),
  ];

  useEffect(() => {
    const unseen = notifications.filter((n) => n.toastable && !toastedIdsRef.current.has(n.id));
    if (unseen.length === 0) return;

    unseen.forEach((n) => toastedIdsRef.current.add(n.id));
    saveToastedIds(toastedIdsRef.current);
    setToasts((prev) => [...prev, ...unseen]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    alerts,
    transfersPendingApproval,
    transfersInTransit,
    transfersRequestedAtOrigin,
    transfersDeniedOrCancelled,
    transfersCancelledByOrigin,
    cancelledOrders,
  ]);

  // useCallback con deps vacías: identidad estable entre renders. Sin esto,
  // cada poll (cada 5s) recreaba esta función, y el useEffect del temporizador
  // de auto-cierre en ToastItem (que depende de onDismiss) se reiniciaba antes
  // de completar sus 15s — la barra corría sola por CSS, pero el toast nunca
  // llegaba a cerrarse solo.
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    notifications,
    loading,
    hasBranch: Boolean(branchId),
    reload: load,
    toasts,
    dismissToast,
  };
}
