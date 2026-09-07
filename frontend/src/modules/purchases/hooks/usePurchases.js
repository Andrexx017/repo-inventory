import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts } from '../../catalog/api/productsApi';
import { getSuppliers } from '../api/suppliersApi';
import {
  getPurchaseOrders,
  getPurchaseOrdersKpiSummary,
  createPurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseReceipt,
  getPurchaseReceipts,
} from '../api/purchaseOrdersApi';
import { startOfDayIso, endOfDayIso } from '../../../shared/dateRange';
import { notifyDataChanged } from '../../../shared/notifyBus';

const ORDERS_PAGE_SIZE = 25;

// Estados alcanzables desde el backend (PurchaseOrderService) — 'draft' y
// 'sent' están en el CHECK de la tabla (histórico/legado) pero el flujo real
// ya no los usa: la orden nace directo en 'confirmed' (el Operador no
// necesita aprobación del Gerente), así que no aparecen acá.
export const ORDER_STATUS_LABELS = {
  confirmed: 'CONFIRMADA',
  partially_received: 'PARCIAL',
  fully_received: 'COMPLETA',
  cancelled: 'CANCELADA',
};

const NON_CANCELLABLE_STATUSES = new Set(['partially_received', 'fully_received', 'cancelled']);
const RECEIVABLE_STATUSES = new Set(['confirmed', 'partially_received']);

function emptyLine() {
  return { productId: '', quantity: '', unitPrice: '', discountPct: '0' };
}

export function usePurchases() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const isInventoryOperator = user?.role === 'inventory_operator';
  const isBranchManager = user?.role === 'branch_manager';
  // RF-04: general_admin tiene "visibilidad y permisos totales" — puede
  // registrar/recibir órdenes (como inventory_operator) en cualquier
  // sucursal, mismo criterio ya aplicado en Inventario (sección 2.14). No
  // tiene sucursal propia, así que a diferencia de los otros dos roles
  // necesita elegir una (ver branches/setBranchId abajo).
  const canManageOrders = isInventoryOperator || isGeneralAdmin;

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [ordersKpi, setOrdersKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('ordenes');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [ordersFilterFrom, setOrdersFilterFrom] = useState('');
  const [ordersFilterTo, setOrdersFilterTo] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [paymentTermDays, setPaymentTermDays] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [formError, setFormError] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptPending, setReceiptPending] = useState({});
  const [receiptQuantities, setReceiptQuantities] = useState({});
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptError, setReceiptError] = useState('');

  async function loadReferenceData() {
    try {
      const [suppliersData, productsData] = await Promise.all([getSuppliers(), getProducts()]);
      setSuppliers(suppliersData);
      setProducts(productsData);

      // general_admin no tiene sucursal propia (getUser().branchId es null) —
      // a diferencia de los otros dos roles, necesita elegir una para poder
      // operar. Se le trae la lista completa y se le arma un valor por
      // defecto, mismo criterio que useInventory.js (sección 2.14).
      if (isGeneralAdmin) {
        const branchesData = await getBranches();
        setBranches(branchesData);
        if (!branchId && branchesData.length > 0) {
          setBranchId(String(branchesData[0].id));
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar proveedores/productos.');
    }
  }

  async function loadOrders() {
    if (!branchId) return;

    setLoading(true);
    try {
      const [page, kpi] = await Promise.all([
        getPurchaseOrders(branchId, {
          supplierId: supplierFilter || undefined,
          from: ordersFilterFrom ? startOfDayIso(ordersFilterFrom) : undefined,
          to: ordersFilterTo ? endOfDayIso(ordersFilterTo) : undefined,
          page: ordersPage,
          pageSize: ORDERS_PAGE_SIZE,
        }),
        getPurchaseOrdersKpiSummary(branchId),
      ]);
      setOrders(page.items);
      setOrdersTotalCount(page.totalCount);
      setOrdersKpi(kpi);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las órdenes de compra.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, supplierFilter, ordersFilterFrom, ordersFilterTo, ordersPage]);

  // Volver a la página 1 cuando cambia el filtro de proveedor o de fechas —
  // evita quedar en una página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setOrdersPage(1);
  }, [supplierFilter, ordersFilterFrom, ordersFilterTo]);

  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotalCount / ORDERS_PAGE_SIZE));

  function resetOrderForm() {
    setSupplierId('');
    setPaymentTermDays('');
    setLines([emptyLine()]);
  }

  function openOrderModal() {
    resetOrderForm();
    setFormError('');
    setIsOrderModalOpen(true);
  }

  function closeOrderModal() {
    resetOrderForm();
    setFormError('');
    setIsOrderModalOpen(false);
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

  function lineAmounts(line) {
    const quantity = Number(line.quantity) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    const discountPct = Number(line.discountPct) || 0;
    const gross = quantity * unitPrice;
    const net = gross * (1 - discountPct / 100);
    return { gross, net };
  }

  const orderTotals = lines.reduce(
    (acc, line) => {
      const { gross, net } = lineAmounts(line);
      acc.subtotal += gross;
      acc.total += net;
      return acc;
    },
    { subtotal: 0, total: 0 }
  );
  orderTotals.discount = orderTotals.subtotal - orderTotals.total;

  async function handleCreateOrder(e) {
    e.preventDefault();
    setFormError('');

    if (!supplierId) {
      setFormError('Seleccioná un proveedor.');
      return;
    }

    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setFormError('Agregá al menos una línea con producto y cantidad.');
      return;
    }

    const dto = {
      supplierId: Number(supplierId),
      paymentTermDays: paymentTermDays === '' ? null : Number(paymentTermDays),
      items: validLines.map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
        discountPct: Number(l.discountPct) || 0,
      })),
    };

    try {
      await createPurchaseOrder(branchId, dto);
      closeOrderModal();
      await loadOrders();
    } catch (err) {
      setFormError(err.message || 'No se pudo crear la orden de compra.');
    }
  }

  async function handleCancel(order) {
    try {
      await cancelPurchaseOrder(branchId, order.id);
      await loadOrders();
      notifyDataChanged();
    } catch (err) {
      setError(err.message || 'No se pudo cancelar la orden.');
    }
  }

  async function openReceipt(order) {
    setReceiptError('');
    setReceiptNotes('');

    try {
      const receipts = await getPurchaseReceipts(branchId, order.id);
      const alreadyReceived = {};
      receipts.forEach((receipt) => {
        receipt.items.forEach((item) => {
          alreadyReceived[item.purchaseOrderItemId] =
            (alreadyReceived[item.purchaseOrderItemId] || 0) + item.receivedQuantity;
        });
      });

      const pending = {};
      const defaults = {};
      order.items.forEach((item) => {
        const received = alreadyReceived[item.id] || 0;
        const pendingQty = item.quantity - received;
        pending[item.id] = pendingQty;
        defaults[item.id] = pendingQty > 0 ? String(pendingQty) : '0';
      });

      setReceiptPending(pending);
      setReceiptQuantities(defaults);
      setReceiptOrder(order);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de recepciones.');
    }
  }

  function closeReceipt() {
    setReceiptOrder(null);
  }

  function setReceiptQuantity(itemId, value) {
    setReceiptQuantities((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSubmitReceipt(e) {
    e.preventDefault();
    setReceiptError('');

    const items = Object.entries(receiptQuantities)
      .map(([purchaseOrderItemId, value]) => ({
        purchaseOrderItemId: Number(purchaseOrderItemId),
        receivedQuantity: Number(value) || 0,
      }))
      .filter((item) => item.receivedQuantity > 0);

    if (items.length === 0) {
      setReceiptError('Ingresá al menos una cantidad recibida mayor a cero.');
      return;
    }

    try {
      await createPurchaseReceipt(branchId, receiptOrder.id, { notes: receiptNotes || null, items });
      setReceiptOrder(null);
      await loadOrders();
      notifyDataChanged();
    } catch (err) {
      setReceiptError(err.message || 'No se pudo confirmar la recepción.');
    }
  }

  function canCancel(order) {
    return !NON_CANCELLABLE_STATUSES.has(order.status);
  }

  function canReceive(order) {
    return canManageOrders && RECEIVABLE_STATUSES.has(order.status);
  }

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,
    isInventoryOperator,
    isBranchManager,
    canManageOrders,
    suppliers,
    products,
    orders,
    ordersPage,
    setOrdersPage,
    ordersTotalPages,
    ordersFilterFrom,
    setOrdersFilterFrom,
    ordersFilterTo,
    setOrdersFilterTo,
    ordersKpi,
    loading,
    error,

    tab,
    setTab,
    supplierFilter,
    setSupplierFilter,

    supplierId,
    setSupplierId,
    paymentTermDays,
    setPaymentTermDays,
    lines,
    addLine,
    removeLine,
    updateLine,
    lineAmounts,
    orderTotals,
    formError,
    handleCreateOrder,
    isOrderModalOpen,
    openOrderModal,
    closeOrderModal,

    handleCancel,
    canCancel,
    canReceive,

    receiptOrder,
    receiptPending,
    receiptQuantities,
    setReceiptQuantity,
    receiptNotes,
    setReceiptNotes,
    receiptError,
    openReceipt,
    closeReceipt,
    handleSubmitReceipt,
  };
}
