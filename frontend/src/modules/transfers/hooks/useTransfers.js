import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts } from '../../catalog/api/productsApi';
import { getInventoryByBranch } from '../../inventory/api/inventoryApi';
import {
  getTransfers,
  getTransfersKpiSummary,
  getTransferById,
  createTransfer,
  approveTransfer,
  cancelTransfer,
  prepareTransfer,
  shipTransfer,
  receiveTransfer,
} from '../api/transfersApi';
import { startOfDayIso, endOfDayIso } from '../../../shared/dateRange';
import { notifyDataChanged } from '../../../shared/notifyBus';

const TRANSFERS_PAGE_SIZE = 25;

export const STATUS_LABELS = {
  requested: 'SOLICITADA',
  preparing: 'EN PREPARACIÓN',
  in_transit: 'EN TRÁNSITO',
  partially_received: 'RECIBIDA CON FALTANTE',
  fully_received: 'RECIBIDA',
  cancelled: 'CANCELADA',
};

export const STATUS_CLASSES = {
  requested: 'status-pill-muted',
  preparing: 'status-pill-warn',
  in_transit: 'status-pill-cyan',
  partially_received: 'status-pill-inactive',
  fully_received: 'status-pill-active',
  cancelled: 'status-pill-inactive',
};

export const URGENCY_LABELS = { low: 'BAJA', medium: 'MEDIA', high: 'ALTA' };
export const URGENCY_CLASSES = { low: 'status-pill-muted', medium: 'status-pill-accent', high: 'status-pill-inactive' };

export const TREATMENT_LABELS = {
  resend: 'Reenvío',
  adjustment: 'Ajuste de inventario',
  claim: 'Reclamo al transportista',
};

const TAB_STATUSES = {
  todas: null,
  solicitadas: ['requested', 'preparing'],
  transito: ['in_transit'],
  recibidas: ['fully_received', 'partially_received'],
};

// Mismo criterio que TransferService.CancelAsync: una vez despachada
// (in_transit) ya se descontó inventario real de origen, cancelar exigiría
// revertirlo — fuera de alcance.
const NON_CANCELLABLE_TRANSFER_STATUSES = new Set(['in_transit', 'fully_received', 'partially_received', 'cancelled']);

function emptyLine() {
  return { productId: '', requestedQuantity: '' };
}

export function useTransfers() {
  const user = getUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isGeneralAdmin = user?.role === 'general_admin';
  const isInventoryOperator = user?.role === 'inventory_operator';
  const isBranchManager = user?.role === 'branch_manager';

  // Alineado con el diagrama de casos de uso (UC19/UC20/UC11), con un ajuste
  // sobre UC20: solicitar transferencia (RF-20) es de Operador, Gerente y
  // Admin. Preparar/despachar (RF-21/22) es de Operador, Gerente y Admin DE
  // LA SUCURSAL ORIGEN — se abrió a Gerente porque una sucursal puede no
  // tener un Operador de inventario propio, y en ese caso el flujo de salida
  // quedaba trabado sin intervención del Admin. Confirmar recepción (RF-23/24)
  // es de Gerente, Operador y Admin. Mismo reparto de roles que
  // TransfersController por método.
  const canRequestTransfer = isInventoryOperator || isGeneralAdmin || isBranchManager;
  const canManageOrigin = isInventoryOperator || isGeneralAdmin || isBranchManager;
  // Ajustado a pedido explícito del usuario: el Operador no confirma
  // recepción — eso queda para el Gerente (+Admin) de la sucursal destino.
  const canManageDestination = isBranchManager || isGeneralAdmin;
  // El Gerente (+Admin) de la sucursal destino aprueba la solicitud de su
  // propio Operador antes de que el origen la prepare — el Operador no
  // aprueba. A diferencia de Compras, acá sí se mantiene este paso (pedido
  // explícito del usuario: solo se eliminó la aprobación en el módulo de
  // Compras, no en Transferencias).
  const canApproveTransfer = isBranchManager || isGeneralAdmin;

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transfersPage, setTransfersPage] = useState(1);
  const [transfersTotalCount, setTransfersTotalCount] = useState(0);
  const [transfersKpi, setTransfersKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('todas');
  const [transfersFilterFrom, setTransfersFilterFrom] = useState('');
  const [transfersFilterTo, setTransfersFilterTo] = useState('');

  const [originBranchId, setOriginBranchId] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [lines, setLines] = useState([emptyLine()]);
  const [originInventory, setOriginInventory] = useState([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [viewTransfer, setViewTransfer] = useState(null);
  const [approveError, setApproveError] = useState('');
  const [resendError, setResendError] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [prepareTarget, setPrepareTarget] = useState(null);
  const [prepareQuantities, setPrepareQuantities] = useState({});
  const [prepareNotes, setPrepareNotes] = useState('');
  const [prepareError, setPrepareError] = useState('');

  const [shipTarget, setShipTarget] = useState(null);
  const [carrier, setCarrier] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [routePriority, setRoutePriority] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [shipNotes, setShipNotes] = useState('');
  const [shipError, setShipError] = useState('');

  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [treatment, setTreatment] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveError, setReceiveError] = useState('');

  async function loadReferenceData() {
    try {
      // A diferencia de Ventas/Compras, acá TODOS los roles necesitan la
      // lista completa de sucursales (no solo general_admin): cualquiera que
      // solicite una transferencia debe elegir la sucursal ORIGEN.
      const [productsData, branchesData] = await Promise.all([getProducts(), getBranches()]);
      setProducts(productsData);
      setBranches(branchesData);

      if (isGeneralAdmin && !branchId && branchesData.length > 0) {
        setBranchId(String(branchesData[0].id));
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar productos/sucursales.');
    }
  }

  async function loadTransfers() {
    if (!branchId) return;

    setLoading(true);
    try {
      const [page, kpi] = await Promise.all([
        getTransfers(branchId, {
          statuses: TAB_STATUSES[tab] || undefined,
          from: transfersFilterFrom ? startOfDayIso(transfersFilterFrom) : undefined,
          to: transfersFilterTo ? endOfDayIso(transfersFilterTo) : undefined,
          page: transfersPage,
          pageSize: TRANSFERS_PAGE_SIZE,
        }),
        getTransfersKpiSummary(branchId),
      ]);
      setTransfers(page.items);
      setTransfersTotalCount(page.totalCount);
      setTransfersKpi(kpi);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las transferencias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, tab, transfersFilterFrom, transfersFilterTo, transfersPage]);

  // Volver a la página 1 cuando cambia la pestaña o el rango de fechas —
  // evita quedar en una página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setTransfersPage(1);
  }, [tab, transfersFilterFrom, transfersFilterTo]);

  // Llegar acá desde una notificación de la campana (transferencia en
  // tránsito) trae el id en location.state — igual patrón que
  // useInventory.js con location.state.productId desde el Dashboard. Se
  // busca directo por id (no dentro de `transfers`, que ahora es solo la
  // página/pestaña visible) y se limpia el state de navegación para que un
  // refresh no reabra el modal.
  useEffect(() => {
    if (location.state?.openTransferId && branchId) {
      getTransferById(branchId, location.state.openTransferId)
        .then((t) => setViewTransfer(t))
        .catch(() => {});
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const transfersTotalPages = Math.max(1, Math.ceil(transfersTotalCount / TRANSFERS_PAGE_SIZE));

  // Stock real de la sucursal ORIGEN elegida en "Solicitar transferencia" —
  // sirve solo para mostrar disponibilidad orientativa antes de pedir (la
  // validación real de stock la sigue haciendo el origen al Preparar, RN-CRIT-03).
  useEffect(() => {
    if (!originBranchId) {
      setOriginInventory([]);
      return;
    }

    let cancelled = false;
    getInventoryByBranch(originBranchId)
      .then((data) => { if (!cancelled) setOriginInventory(data); })
      .catch(() => { if (!cancelled) setOriginInventory([]); });

    return () => { cancelled = true; };
  }, [originBranchId]);

  // "Disponible para transferir" = stock actual menos el umbral mínimo de la
  // sucursal origen (RF-09) — no lo que hay en total, sino lo que se puede
  // sacar sin dejar a esa sucursal por debajo de su propio mínimo.
  function availableToTransfer(productId) {
    if (!productId) return null;
    const item = originInventory.find((i) => i.productId === Number(productId));
    if (!item) return 0;
    return Math.max(item.currentQuantity - item.minimumStock, 0);
  }

  function resetTransferForm() {
    setOriginBranchId('');
    setUrgency('medium');
    setLines([emptyLine()]);
  }

  function openRequestModal() {
    resetTransferForm();
    setFormError('');
    setFormSuccess('');
    setIsRequestModalOpen(true);
  }

  function closeRequestModal() {
    resetTransferForm();
    setFormError('');
    setFormSuccess('');
    setIsRequestModalOpen(false);
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index, field, value) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  async function handleCreateTransfer(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!originBranchId) {
      setFormError('Seleccioná la sucursal origen.');
      return;
    }

    if (Number(originBranchId) === Number(branchId)) {
      setFormError('La sucursal de origen no puede ser la misma que la de destino.');
      return;
    }

    const validLines = lines.filter((l) => l.productId && Number(l.requestedQuantity) > 0);
    if (validLines.length === 0) {
      setFormError('Agregá al menos una línea con producto y cantidad.');
      return;
    }

    const dto = {
      originBranchId: Number(originBranchId),
      urgency,
      items: validLines.map((l) => ({
        productId: Number(l.productId),
        requestedQuantity: Number(l.requestedQuantity),
      })),
    };

    try {
      const transfer = await createTransfer(branchId, dto);
      resetTransferForm();
      setFormSuccess(`Transferencia ${transfer.transferNumber} solicitada.`);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setFormError(err.message || 'No se pudo solicitar la transferencia.');
    }
  }

  function openView(transfer) {
    setViewTransfer(transfer);
  }

  function closeView() {
    setViewTransfer(null);
  }

  function closeActionPanels() {
    setPrepareTarget(null);
    setShipTarget(null);
    setReceiveTarget(null);
  }

  function openPrepare(transfer) {
    closeActionPanels();
    setPrepareError('');
    setPrepareNotes('');
    const defaults = {};
    transfer.items.forEach((item) => {
      defaults[item.id] = String(item.requestedQuantity);
    });
    setPrepareQuantities(defaults);
    setPrepareTarget(transfer);
  }

  function closePrepare() {
    setPrepareTarget(null);
  }

  function setPrepareQuantity(itemId, value) {
    setPrepareQuantities((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmitPrepare(e) {
    e.preventDefault();
    setPrepareError('');

    const items = prepareTarget.items.map((item) => ({
      transferItemId: item.id,
      shippedQuantity: Number(prepareQuantities[item.id]) || 0,
    }));

    try {
      await prepareTransfer(branchId, prepareTarget.id, { notes: prepareNotes || null, items });
      setPrepareTarget(null);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setPrepareError(err.message || 'No se pudo preparar la transferencia.');
    }
  }

  function openShip(transfer) {
    closeActionPanels();
    setShipError('');
    setCarrier('');
    setEstimatedDeliveryDate('');
    setRoutePriority('');
    setShippingCost('');
    setShipNotes('');
    setShipTarget(transfer);
  }

  function closeShip() {
    setShipTarget(null);
  }

  async function handleSubmitShip(e) {
    e.preventDefault();
    setShipError('');

    if (!carrier || !estimatedDeliveryDate) {
      setShipError('Indicá el transportista y la fecha estimada de llegada.');
      return;
    }

    const dto = {
      carrier,
      estimatedDeliveryDate,
      routePriority: routePriority || null,
      shippingCost: shippingCost === '' ? null : Number(shippingCost),
      notes: shipNotes || null,
    };

    try {
      await shipTransfer(branchId, shipTarget.id, dto);
      setShipTarget(null);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setShipError(err.message || 'No se pudo despachar la transferencia.');
    }
  }

  function openReceive(transfer) {
    closeActionPanels();
    setReceiveError('');
    setTreatment('');
    setReceiveNotes('');
    const defaults = {};
    transfer.items.forEach((item) => {
      defaults[item.id] = String(item.shippedQuantity);
    });
    setReceiveQuantities(defaults);
    setReceiveTarget(transfer);
  }

  function closeReceive() {
    setReceiveTarget(null);
  }

  function setReceiveQuantity(itemId, value) {
    setReceiveQuantities((prev) => ({ ...prev, [itemId]: value }));
  }

  // El faltante se detecta acá mismo (no en el submit) para poder mostrar el
  // campo de tratamiento en cuanto el usuario escribe una cantidad menor a lo
  // despachado — la validación real de "obligatorio si hay faltante" la hace
  // igual el backend (RF-24).
  const receiveHasShortage = Boolean(
    receiveTarget?.items.some((item) => Number(receiveQuantities[item.id]) < item.shippedQuantity)
  );

  async function handleSubmitReceive(e) {
    e.preventDefault();
    setReceiveError('');

    if (receiveHasShortage && !treatment) {
      setReceiveError('Hay una diferencia entre lo despachado y lo recibido: indicá un tratamiento.');
      return;
    }

    const items = receiveTarget.items.map((item) => ({
      transferItemId: item.id,
      receivedQuantity: Number(receiveQuantities[item.id]) || 0,
    }));

    try {
      await receiveTransfer(branchId, receiveTarget.id, {
        items,
        treatment: treatment || null,
        notes: receiveNotes || null,
      });
      setReceiveTarget(null);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setReceiveError(err.message || 'No se pudo confirmar la recepción.');
    }
  }

  async function handleApprove(transfer) {
    setApproveError('');
    try {
      await approveTransfer(branchId, transfer.id);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setApproveError(err.message || 'No se pudo aprobar la transferencia.');
    }
  }

  // Tratamiento "resend" (RF-24): en vez de solo dejarlo anotado, arma y
  // solicita de una la transferencia de reposición — misma ruta que
  // "Solicitar transferencia" (CreateAsync), con las líneas precargadas por
  // el faltante (item.difference) de la transferencia original. No hay forma
  // de marcar "ya se reenvió" (sin un campo nuevo para eso) — queda a
  // criterio del usuario no reenviar dos veces la misma transferencia.
  async function handleResend(transfer) {
    setResendError('');

    const missingItems = transfer.items
      .filter((item) => item.difference > 0)
      .map((item) => ({ productId: item.productId, requestedQuantity: item.difference }));

    if (missingItems.length === 0) {
      setResendError('Esta transferencia no tiene faltante para reenviar.');
      return;
    }

    try {
      await createTransfer(branchId, {
        originBranchId: transfer.originBranchId,
        urgency: 'high',
        items: missingItems,
      });
      closeView();
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setResendError(err.message || 'No se pudo reenviar el faltante.');
    }
  }

  // Denegar (todavía 'requested') o cancelar (ya 'preparing') — desde origen o
  // destino, mientras no se haya despachado. Un solo endpoint/handler para
  // ambos casos, igual criterio que CancelAsync en el backend.
  async function handleCancel(transfer) {
    setCancelError('');
    try {
      await cancelTransfer(branchId, transfer.id);
      await loadTransfers();
      notifyDataChanged();
    } catch (err) {
      setCancelError(err.message || 'No se pudo cancelar la transferencia.');
    }
  }

  // "Denegar" (solicitud todavía sin aprobar, vista desde destino) es el
  // rechazo simétrico de Aprobar — mismo rol (Gerente+Admin, el Operador
  // queda afuera a pedido explícito del usuario).
  function canDeny(transfer) {
    return (
      canApproveTransfer &&
      transfer.status === 'requested' &&
      !transfer.approvedAt &&
      transfer.destinationBranchId === Number(branchId)
    );
  }

  // Ya aprobada (esperando prepararse) o en preparación: cancelar es tarea
  // operativa del origen, mismo rol que Preparar/Despachar.
  function canCancel(transfer) {
    return (
      canManageOrigin &&
      !NON_CANCELLABLE_TRANSFER_STATUSES.has(transfer.status) &&
      (transfer.status === 'preparing' || Boolean(transfer.approvedAt)) &&
      transfer.originBranchId === Number(branchId)
    );
  }

  function canApprove(transfer) {
    return (
      canApproveTransfer &&
      transfer.status === 'requested' &&
      !transfer.approvedAt &&
      transfer.destinationBranchId === Number(branchId)
    );
  }

  function canPrepare(transfer) {
    return (
      canManageOrigin &&
      transfer.status === 'requested' &&
      Boolean(transfer.approvedAt) &&
      transfer.originBranchId === Number(branchId)
    );
  }

  function canShip(transfer) {
    return canManageOrigin && transfer.status === 'preparing' && transfer.originBranchId === Number(branchId);
  }

  function canReceiveTransfer(transfer) {
    return canManageDestination && transfer.status === 'in_transit' && transfer.destinationBranchId === Number(branchId);
  }

  // Mismo rol que solicita una transferencia (RF-20) — el reenvío es, en los
  // hechos, una solicitud nueva — sobre la sucursal DESTINO de la original,
  // con faltante y tratamiento "resend" elegido al recibir.
  function canResend(transfer) {
    return (
      canRequestTransfer &&
      transfer.status === 'partially_received' &&
      transfer.shortageTreatment === 'resend' &&
      transfer.destinationBranchId === Number(branchId)
    );
  }

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canRequestTransfer,
    products,
    transfers,
    transfersPage,
    setTransfersPage,
    transfersTotalPages,
    transfersFilterFrom,
    setTransfersFilterFrom,
    transfersFilterTo,
    setTransfersFilterTo,
    transfersKpi,
    loading,
    error,

    tab,
    setTab,

    originBranchId,
    setOriginBranchId,
    urgency,
    setUrgency,
    lines,
    availableToTransfer,
    addLine,
    removeLine,
    updateLine,
    formError,
    formSuccess,
    handleCreateTransfer,
    isRequestModalOpen,
    openRequestModal,
    closeRequestModal,

    viewTransfer,
    openView,
    closeView,

    approveError,
    handleApprove,
    canApprove,

    resendError,
    handleResend,
    canResend,

    cancelError,
    handleCancel,
    canCancel,
    canDeny,

    prepareTarget,
    prepareQuantities,
    setPrepareQuantity,
    prepareNotes,
    setPrepareNotes,
    prepareError,
    openPrepare,
    closePrepare,
    handleSubmitPrepare,

    shipTarget,
    carrier,
    setCarrier,
    estimatedDeliveryDate,
    setEstimatedDeliveryDate,
    routePriority,
    setRoutePriority,
    shippingCost,
    setShippingCost,
    shipNotes,
    setShipNotes,
    shipError,
    openShip,
    closeShip,
    handleSubmitShip,

    receiveTarget,
    receiveQuantities,
    setReceiveQuantity,
    receiveHasShortage,
    treatment,
    setTreatment,
    receiveNotes,
    setReceiveNotes,
    receiveError,
    openReceive,
    closeReceive,
    handleSubmitReceive,

    canPrepare,
    canShip,
    canReceiveTransfer,
  };
}
