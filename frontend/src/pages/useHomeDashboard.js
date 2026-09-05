import { useEffect, useState } from 'react';
import { getUser } from '../shared/apiClient';
import { getBranches } from '../modules/auth/api/branchesApi';
import { getSales, getSalesKpiSummary } from '../modules/sales/api/salesApi';
import { getMovements } from '../modules/inventory/api/inventoryApi';
import { isIncomingMovement } from '../modules/inventory/hooks/useInventory';
import { getTransfers } from '../modules/transfers/api/transfersApi';
import { STATUS_LABELS as TRANSFER_STATUS_LABELS } from '../modules/transfers/hooks/useTransfers';
import { getPurchaseOrders, getPurchaseOrdersKpiSummary } from '../modules/purchases/api/purchaseOrdersApi';
import { ORDER_STATUS_LABELS } from '../modules/purchases/hooks/usePurchases';

const FEED_PAGE_SIZE = 8;
const FEED_MAX_ROWS = 15;

function dayBucket(dateIso) {
  const date = new Date(dateIso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'hoy';
  if (sameDay(date, yesterday)) return 'ayer';
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// "hace 12 min" para eventos de hoy — un timestamp exacto no aporta nada que
// el usuario vaya a leer distinto de "hace un rato"; para lo de ayer/antes sí
// tiene sentido mostrar la hora puntual (ver formatEventTime).
function relativeTime(dateIso) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

function formatEventTime(dateIso, bucket) {
  if (bucket === 'hoy') return relativeTime(dateIso);
  const time = new Date(dateIso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return bucket === 'ayer' ? `ayer, ${time}` : `${bucket}, ${time}`;
}

function formatMoney(value) {
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

// Solo movimientos MANUALES (ingreso/ajuste registrado a mano) — los que
// vienen con referenceType 'sale'/'transfer'/'purchase_order' ya los cuenta
// su propio evento (venta, transferencia, recepción de compra); mostrar
// también el movimiento de inventario que esas acciones disparan duplicaría
// la misma fila dos veces en el feed.
function isManualMovement(movement) {
  return !movement.referenceType || movement.referenceType === 'manual_adjustment';
}

function transferEvent(transfer) {
  if (transfer.status === 'fully_received' || transfer.status === 'partially_received') {
    return {
      date: transfer.actualArrivalDate,
      title: `Transferencia ${transfer.transferNumber} — ${transfer.status === 'partially_received' ? 'recibida con faltante' : 'recibida'}`,
    };
  }
  if (transfer.actualShipDate) {
    return { date: transfer.actualShipDate, title: `Transferencia ${transfer.transferNumber} — en tránsito` };
  }
  return {
    date: transfer.createdAt,
    title: `Transferencia ${transfer.transferNumber} — ${(TRANSFER_STATUS_LABELS[transfer.status] || transfer.status).toLowerCase()}`,
  };
}

export function useHomeDashboard() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branches, setBranches] = useState([]);
  const [feed, setFeed] = useState([]);
  const [eventsToday, setEventsToday] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [unitsToday, setUnitsToday] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [branchActivity, setBranchActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  async function load() {
    setLoading(true);

    let branchesData = [];
    try {
      branchesData = await getBranches();
      setBranches(branchesData);
    } catch {
      // Sin sucursales no hay nada que traer — se deja el panel en blanco.
    }

    const scopeBranches = isGeneralAdmin
      ? branchesData
      : branchesData.filter((b) => String(b.id) === String(user?.branchId));

    if (scopeBranches.length === 0) {
      setLoading(false);
      return;
    }

    // Un round-trip por sucursal y por módulo — el volumen (pocas sucursales,
    // páginas chicas) es manejable para una pantalla de inicio; ver
    // Dashboard.jsx para el mismo criterio de agregar en el cliente sin
    // agregar endpoints nuevos al backend.
    const perBranch = await Promise.all(
      scopeBranches.map(async (branch) => {
        const [salesRes, movementsRes, transfersRes, ordersRes, salesKpiRes, ordersKpiRes] = await Promise.allSettled([
          getSales(branch.id, { page: 1, pageSize: FEED_PAGE_SIZE }),
          getMovements(branch.id, { page: 1, pageSize: FEED_PAGE_SIZE }),
          getTransfers(branch.id, { page: 1, pageSize: FEED_PAGE_SIZE }),
          getPurchaseOrders(branch.id, { page: 1, pageSize: FEED_PAGE_SIZE }),
          getSalesKpiSummary(branch.id),
          getPurchaseOrdersKpiSummary(branch.id),
        ]);

        const events = [];

        if (salesRes.status === 'fulfilled') {
          for (const sale of salesRes.value.items) {
            events.push({
              id: `sale-${sale.id}`,
              type: 'venta',
              date: sale.saleDate,
              icon: 'cyan',
              title: `Venta ${sale.saleNumber} registrada`,
              meta: `${sale.branchName} · por ${sale.sellerName}`,
              amount: sale.total,
              branchId: branch.id,
            });
          }
        }

        if (movementsRes.status === 'fulfilled') {
          for (const movement of movementsRes.value.items.filter(isManualMovement)) {
            const incoming = isIncomingMovement(movement.movementType);
            events.push({
              id: `mov-${movement.id}`,
              type: 'movimiento',
              date: movement.movementDate,
              icon: incoming ? 'success' : 'warning',
              title: `${incoming ? 'Ingreso' : 'Ajuste'} de inventario — ${movement.productName} ${incoming ? '+' : '−'}${movement.quantity} uds`,
              meta: `${movement.branchName} · por ${movement.responsibleUserName}${movement.reason ? ` · "${movement.reason}"` : ''}`,
              branchId: branch.id,
            });
          }
        }

        if (transfersRes.status === 'fulfilled') {
          for (const transfer of transfersRes.value.items) {
            const { date, title } = transferEvent(transfer);
            events.push({
              id: `transfer-${transfer.id}`,
              type: 'transferencia',
              date,
              icon: transfer.status === 'partially_received' ? 'warning' : 'accent',
              title,
              meta: `${transfer.originBranchName} → ${transfer.destinationBranchName}`,
              branchId: branch.id,
            });
          }
        }

        if (ordersRes.status === 'fulfilled') {
          for (const order of ordersRes.value.items) {
            events.push({
              id: `order-${order.id}`,
              type: 'compra',
              date: order.orderDate,
              icon: 'muted',
              title: `Orden de compra ${order.orderNumber} — ${(ORDER_STATUS_LABELS[order.status] || order.status).toLowerCase()}`,
              meta: order.supplierName,
              amount: order.total,
              branchId: branch.id,
            });
          }
        }

        return {
          branchId: branch.id,
          branchName: branch.name,
          events,
          salesKpi: salesKpiRes.status === 'fulfilled' ? salesKpiRes.value : null,
          ordersKpi: ordersKpiRes.status === 'fulfilled' ? ordersKpiRes.value : null,
        };
      })
    );

    const allEvents = perBranch.flatMap((b) => b.events).sort((a, b) => new Date(b.date) - new Date(a.date));

    const todayCount = allEvents.filter((e) => dayBucket(e.date) === 'hoy').length;

    const activityByBranch = perBranch
      .map((b) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        count: b.events.filter((e) => dayBucket(e.date) === 'hoy').length,
      }))
      .sort((a, b) => b.count - a.count);

    setFeed(allEvents.slice(0, FEED_MAX_ROWS));
    setEventsToday(todayCount);
    setBranchActivity(activityByBranch);
    setMonthTotal(perBranch.reduce((sum, b) => sum + (b.salesKpi?.monthTotal ?? 0), 0));
    setUnitsToday(perBranch.reduce((sum, b) => sum + (b.salesKpi?.unitsToday ?? 0), 0));
    setActiveOrders(perBranch.reduce((sum, b) => sum + (b.ordersKpi?.activeOrders ?? 0), 0));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFeed = feed.filter((event) => {
    if (eventTypeFilter && event.type !== eventTypeFilter) return false;
    if (branchFilter && String(event.branchId) !== branchFilter) return false;
    return true;
  });

  const groupedFeed = [];
  for (const event of filteredFeed) {
    const bucket = dayBucket(event.date);
    let group = groupedFeed.find((g) => g.bucket === bucket);
    if (!group) {
      group = { bucket, label: bucket === 'hoy' ? 'HOY' : bucket === 'ayer' ? 'AYER' : bucket.toUpperCase(), items: [] };
      groupedFeed.push(group);
    }
    group.items.push({ ...event, timeLabel: formatEventTime(event.date, bucket) });
  }

  return {
    loading,
    isGeneralAdmin,
    branches,
    groupedFeed,
    eventTypeFilter,
    setEventTypeFilter,
    branchFilter,
    setBranchFilter,
    eventsToday,
    branchActivity,
    monthTotal: formatMoney(monthTotal),
    unitsToday,
    activeOrders,
  };
}
