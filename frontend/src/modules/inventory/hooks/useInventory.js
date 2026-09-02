import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts, getProductCategories } from '../../catalog/api/productsApi';
import { startOfDayIso, endOfDayIso } from '../../../shared/dateRange';
import {
  getInventoryByBranch,
  getInventoryPaged,
  getMovements,
  registerIncoming,
  registerOutgoing,
  setThresholds,
  getAlerts,
  resolveAlert,
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

const MOVEMENTS_PAGE_SIZE = 25;
const ITEMS_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export const STOCK_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'critico', label: 'Crítico' },
  { value: 'bajo', label: 'Bajo' },
  { value: 'ok', label: 'OK' },
];

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
  const isInventoryOperator = user?.role === 'inventory_operator';
  const location = useLocation();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  // Llegar acá desde el "Ir a Inventario" del Dashboard (alerta de reabastecimiento)
  // trae la sucursal de la alerta en location.state — tiene prioridad sobre la
  // sucursal propia del usuario, igual que el resto del formulario se preselecciona
  // más abajo (ver el useEffect de location.state.productId).
  const [branchId, setBranchId] = useState(() => {
    if (location.state?.branchId) return String(location.state.branchId);
    return user?.branchId ? String(user.branchId) : '';
  });

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagedItems, setPagedItems] = useState([]);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsTotalCount, setItemsTotalCount] = useState(0);
  const [movements, setMovements] = useState([]);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotalCount, setMovementsTotalCount] = useState(0);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('existencias');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [movementFilterProductId, setMovementFilterProductId] = useState('');
  const [movementFilterFrom, setMovementFilterFrom] = useState('');
  const [movementFilterTo, setMovementFilterTo] = useState('');

  const [direction, setDirection] = useState('ingreso');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState(INCOMING_TYPES[0].value);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [movementDate, setMovementDate] = useState(todayInputValue());
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [thresholdEditingItem, setThresholdEditingItem] = useState(null);
  const [thresholdMin, setThresholdMin] = useState('');
  const [thresholdMax, setThresholdMax] = useState('');
  const [thresholdError, setThresholdError] = useState('');

  const [alertError, setAlertError] = useState('');
  const [resolvingAlertId, setResolvingAlertId] = useState(null);

  const canMutate = isGeneralAdmin || (!!branchId && String(user?.branchId) === String(branchId));

  // UC14/UC15 del diagrama de casos de uso: registrar ingreso/retiro es
  // exclusivo de Operador (+Admin) — a diferencia de canMutate (umbrales,
  // resolución de alertas), que sí las puede tocar cualquier rol de su propia
  // sucursal, fuera del alcance de este diagrama.
  const canRegisterMovement = isGeneralAdmin || (isInventoryOperator && canMutate);

  // Filtros de Existencias "debounced" — mismo mecanismo que useProducts.js:
  // esperan a que el usuario deje de tocarlos antes de pegarle al backend.
  const [debouncedItemFilters, setDebouncedItemFilters] = useState({
    search: itemSearch, categoryId: '', status: '',
  });
  const isFirstItemFilterRun = useRef(true);

  useEffect(() => {
    if (isFirstItemFilterRun.current) {
      isFirstItemFilterRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedItemFilters({
        search: itemSearch,
        categoryId: itemCategoryFilter,
        status: itemStatusFilter,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [itemSearch, itemCategoryFilter, itemStatusFilter]);

  // Volver a la página 1 cuando cambia algún filtro — evita quedar en una
  // página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setItemsPage(1);
  }, [debouncedItemFilters]);

  async function loadReferenceData() {
    try {
      const [branchesData, productsData, categoriesData] = await Promise.all([
        getBranches(),
        getProducts(),
        getProductCategories(),
      ]);
      setBranches(branchesData);
      setProducts(productsData);
      setCategories(categoriesData);

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
      const [itemsData, alertsData] = await Promise.all([
        getInventoryByBranch(branchId),
        getAlerts(branchId),
      ]);
      setItems(itemsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el inventario de la sucursal.');
    } finally {
      setLoading(false);
    }
  }

  // Existencias paginadas y filtrables (búsqueda/categoría/estado) — separado
  // de loadInventoryData, que sigue trayendo el inventario COMPLETO de la
  // sucursal sin paginar (lo necesitan las tarjetas de KPI de acá abajo, y la
  // campana/Home para cruzar alertas por productId).
  async function loadPagedItems() {
    if (!branchId) return;

    try {
      const page = await getInventoryPaged(branchId, {
        search: debouncedItemFilters.search || undefined,
        categoryId: debouncedItemFilters.categoryId || undefined,
        status: debouncedItemFilters.status || undefined,
        page: itemsPage,
        pageSize: ITEMS_PAGE_SIZE,
      });
      setPagedItems(page.items);
      setItemsTotalCount(page.totalCount);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las existencias.');
    }
  }

  // RF-11: historial paginado server-side (ver inventoryApi.getMovements) — separado
  // de loadInventoryData porque cambia de página o de filtro sin que haya que
  // recargar existencias/alertas.
  async function loadMovements() {
    if (!branchId) return;

    try {
      const page = await getMovements(branchId, {
        productId: movementFilterProductId || undefined,
        from: movementFilterFrom ? startOfDayIso(movementFilterFrom) : undefined,
        to: movementFilterTo ? endOfDayIso(movementFilterTo) : undefined,
        page: movementsPage,
        pageSize: MOVEMENTS_PAGE_SIZE,
      });
      setMovements(page.items);
      setMovementsTotalCount(page.totalCount);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de movimientos.');
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [branchId]);

  useEffect(() => {
    loadPagedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, debouncedItemFilters, itemsPage]);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, movementFilterProductId, movementFilterFrom, movementFilterTo, movementsPage]);

  // Volver a la página 1 cuando cambia el filtro de producto o de fechas —
  // evita quedar en una página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setMovementsPage(1);
  }, [movementFilterProductId, movementFilterFrom, movementFilterTo]);

  // Preselecciona el producto de la alerta que trajo al usuario acá (ver
  // goToInventoryForRestock en useDashboard.js) y limpia el state de navegación
  // para que un refresh/volver atrás no vuelva a pisar el formulario.
  useEffect(() => {
    if (location.state?.productId) {
      setProductId(String(location.state.productId));
      setIsMovementModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openMovementModal() {
    resetMovementForm();
    setFormError('');
    setIsMovementModalOpen(true);
  }

  function closeMovementModal() {
    resetMovementForm();
    setFormError('');
    setIsMovementModalOpen(false);
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

      closeMovementModal();
      await loadInventoryData();
      await loadPagedItems();
      if (movementsPage === 1) {
        await loadMovements();
      } else {
        setMovementsPage(1);
      }
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
      await loadPagedItems();
    } catch (err) {
      setThresholdError(err.message || 'No se pudo actualizar el umbral.');
    }
  }

  async function handleResolveAlert(alertId) {
    setAlertError('');
    setResolvingAlertId(alertId);

    try {
      await resolveAlert(branchId, alertId);
      await loadInventoryData();
    } catch (err) {
      setAlertError(err.message || 'No se pudo resolver la alerta.');
    } finally {
      setResolvingAlertId(null);
    }
  }

  const movementsTotalPages = Math.max(1, Math.ceil(movementsTotalCount / MOVEMENTS_PAGE_SIZE));
  const itemsTotalPages = Math.max(1, Math.ceil(itemsTotalCount / ITEMS_PAGE_SIZE));

  return {
    branches,
    products,
    categories,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canMutate,
    canRegisterMovement,

    items,
    pagedItems,
    itemsPage,
    setItemsPage,
    itemsTotalCount,
    itemsTotalPages,
    itemSearch,
    setItemSearch,
    itemCategoryFilter,
    setItemCategoryFilter,
    itemStatusFilter,
    setItemStatusFilter,
    movements,
    alerts,
    loading,
    error,

    tab,
    setTab,
    movementFilterProductId,
    setMovementFilterProductId,
    movementFilterFrom,
    setMovementFilterFrom,
    movementFilterTo,
    setMovementFilterTo,
    movementsPage,
    setMovementsPage,
    movementsTotalPages,

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
    isMovementModalOpen,
    openMovementModal,
    closeMovementModal,

    thresholdEditingItem,
    thresholdMin,
    setThresholdMin,
    thresholdMax,
    setThresholdMax,
    thresholdError,
    handleEditThreshold,
    cancelThresholdEdit,
    handleSubmitThreshold,

    alertError,
    resolvingAlertId,
    handleResolveAlert,
  };
}
