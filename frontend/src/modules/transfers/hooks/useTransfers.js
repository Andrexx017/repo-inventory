import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts } from '../../catalog/api/productsApi';
import {
  getTransfers,
  createTransfer,
  prepareTransfer,
  shipTransfer,
  receiveTransfer,
} from '../api/transfersApi';

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

function emptyLine() {
  return { productId: '', requestedQuantity: '' };
}

export function useTransfers() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const isInventoryOperator = user?.role === 'inventory_operator';
  const isBranchManager = user?.role === 'branch_manager';

  // RF-20/21/22: solicitar, preparar y despachar son responsabilidad del
  // Operador de inventario (más general_admin, RF-04). RF-23/24: confirmar la
  // recepción es del Gerente de sucursal — mismo reparto de roles que ya usa
  // TransfersController por método, no por la clase completa.
  const canRequestTransfer = isInventoryOperator || isGeneralAdmin;
  const canManageOrigin = isInventoryOperator || isGeneralAdmin;
  const canManageDestination = isBranchManager || isGeneralAdmin;

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('todas');

  const [originBranchId, setOriginBranchId] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [lines, setLines] = useState([emptyLine()]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [viewTransfer, setViewTransfer] = useState(null);

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
      const data = await getTransfers(branchId);
      setTransfers(data);
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
  }, [branchId]);

  const visibleTransfers = transfers.filter((t) => {
    const statuses = TAB_STATUSES[tab];
    return !statuses || statuses.includes(t.status);
  });

  function resetTransferForm() {
    setOriginBranchId('');
    setUrgency('medium');
    setLines([emptyLine()]);
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
    } catch (err) {
      setReceiveError(err.message || 'No se pudo confirmar la recepción.');
    }
  }

  function canPrepare(transfer) {
    return canManageOrigin && transfer.status === 'requested' && transfer.originBranchId === Number(branchId);
  }

  function canShip(transfer) {
    return canManageOrigin && transfer.status === 'preparing' && transfer.originBranchId === Number(branchId);
  }

  function canReceiveTransfer(transfer) {
    return canManageDestination && transfer.status === 'in_transit' && transfer.destinationBranchId === Number(branchId);
  }

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canRequestTransfer,
    products,
    transfers: visibleTransfers,
    allTransfers: transfers,
    loading,
    error,

    tab,
    setTab,

    originBranchId,
    setOriginBranchId,
    urgency,
    setUrgency,
    lines,
    addLine,
    removeLine,
    updateLine,
    formError,
    formSuccess,
    handleCreateTransfer,

    viewTransfer,
    openView,
    closeView,

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
