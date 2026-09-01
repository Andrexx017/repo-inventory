import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts } from '../../catalog/api/productsApi';
import {
  getInventoryByBranch,
  getMovements,
  registerIncoming,
  registerOutgoing,
  setThresholds,
  getAlerts,
} from '../api/inventoryApi';

export const INCOMING_TYPES = [
  { value: 'purchase_in', label: 'Compra a proveedor' },
  { value: 'return_in', label: 'Devolución de cliente' },
  { value: 'adjustment_in', label: 'Ajuste positivo' },
];

export const OUTGOING_TYPES = [
  { value: 'sale_out', label: 'Venta' },
  { value: 'shrinkage_out', label: 'Merma' },
  { value: 'adjustment_out', label: 'Ajuste negativo' },
];

const MOVEMENT_TYPE_LABELS = Object.fromEntries(
  [...INCOMING_TYPES, ...OUTGOING_TYPES].map((type) => [type.value, type.label])
);

const INCOMING_VALUES = new Set(INCOMING_TYPES.map((type) => type.value));

export function isIncomingMovement(movementType) {
  return INCOMING_VALUES.has(movementType);
}

export function movementTypeLabel(movementType) {
  return MOVEMENT_TYPE_LABELS[movementType] || movementType;
}

// Estado de stock por producto: mismo semáforo que se acordó en el mockup
// (OK / BAJO / CRÍTICO). No viene calculado por el backend, así que se deriva
// acá a partir de currentQuantity/minimumStock — minimumStock en 0 significa
// "sin umbral configurado" (RF-09), igual criterio que InventoryService.CheckLowStockAlertAsync.
export function stockStatus(item) {
  if (item.minimumStock <= 0) return 'ok';
  if (item.currentQuantity <= item.minimumStock * 0.5) return 'critico';
  if (item.currentQuantity <= item.minimumStock) return 'bajo';
  return 'ok';
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function useInventory() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');

  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('existencias');
  const [movementFilterProductId, setMovementFilterProductId] = useState('');

  const [direction, setDirection] = useState('ingreso');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState(INCOMING_TYPES[0].value);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [movementDate, setMovementDate] = useState(todayInputValue());
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const [thresholdEditingItem, setThresholdEditingItem] = useState(null);
  const [thresholdMin, setThresholdMin] = useState('');
  const [thresholdMax, setThresholdMax] = useState('');
  const [thresholdError, setThresholdError] = useState('');

  const canMutate = isGeneralAdmin || (!!branchId && String(user?.branchId) === String(branchId));

  async function loadReferenceData() {
    try {
      const [branchesData, productsData] = await Promise.all([getBranches(), getProducts()]);
      setBranches(branchesData);
      setProducts(productsData);

      if (!branchId && branchesData.length > 0) {
        setBranchId(String(branchesData[0].id));
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las sucursales/productos.');
    }
  }

  async function loadInventoryData() {
    if (!branchId) return;

    setLoading(true);
    try {
      const [itemsData, movementsData, alertsData] = await Promise.all([
        getInventoryByBranch(branchId),
        getMovements(branchId),
        getAlerts(branchId),
      ]);
      setItems(itemsData);
      setMovements(movementsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el inventario de la sucursal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [branchId]);

  function resetMovementForm() {
    setProductId('');
    setQuantity('');
    setUnitCost('');
    setMovementDate(todayInputValue());
    setReason('');
  }

  function handleDirectionChange(nextDirection) {
    setDirection(nextDirection);
    setMovementType(nextDirection === 'ingreso' ? INCOMING_TYPES[0].value : OUTGOING_TYPES[0].value);
    setUnitCost('');
    setFormError('');
  }

  async function handleSubmitMovement(e) {
    e.preventDefault();
    setFormError('');

    if (!productId) {
      setFormError('Seleccioná un producto.');
      return;
    }

    const dto = {
      productId: Number(productId),
      movementType,
      quantity: Number(quantity),
      unitCost: direction === 'ingreso' && unitCost !== '' ? Number(unitCost) : null,
      reason,
      movementDate: new Date(movementDate).toISOString(),
    };

    try {
      if (direction === 'ingreso') {
        await registerIncoming(branchId, dto);
      } else {
        await registerOutgoing(branchId, dto);
      }

      resetMovementForm();
      await loadInventoryData();
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar el movimiento.');
    }
  }

  function handleEditThreshold(item) {
    setThresholdEditingItem(item);
    setThresholdMin(String(item.minimumStock));
    setThresholdMax(item.maximumStock != null ? String(item.maximumStock) : '');
    setThresholdError('');
  }

  function cancelThresholdEdit() {
    setThresholdEditingItem(null);
    setThresholdError('');
  }

  async function handleSubmitThreshold(e) {
    e.preventDefault();
    setThresholdError('');

    try {
      await setThresholds(branchId, thresholdEditingItem.productId, {
        minimumStock: Number(thresholdMin),
        maximumStock: thresholdMax === '' ? null : Number(thresholdMax),
      });

      setThresholdEditingItem(null);
      await loadInventoryData();
    } catch (err) {
      setThresholdError(err.message || 'No se pudo actualizar el umbral.');
    }
  }

  const filteredMovements = movementFilterProductId
    ? movements.filter((m) => String(m.productId) === movementFilterProductId)
    : movements;

  return {
    branches,
    products,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canMutate,

    items,
    movements: filteredMovements,
    alerts,
    loading,
    error,

    tab,
    setTab,
    movementFilterProductId,
    setMovementFilterProductId,

    direction,
    handleDirectionChange,
    productId,
    setProductId,
    movementType,
    setMovementType,
    quantity,
    setQuantity,
    unitCost,
    setUnitCost,
    movementDate,
    setMovementDate,
    reason,
    setReason,
    formError,
    handleSubmitMovement,

    thresholdEditingItem,
    thresholdMin,
    setThresholdMin,
    thresholdMax,
    setThresholdMax,
    thresholdError,
    handleEditThreshold,
    cancelThresholdEdit,
    handleSubmitThreshold,
  };
}
