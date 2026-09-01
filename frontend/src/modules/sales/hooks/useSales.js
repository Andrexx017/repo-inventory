import { useEffect, useState } from 'react';
import { getUser } from '../../../shared/apiClient';
import { getBranches } from '../../auth/api/branchesApi';
import { getProducts } from '../../catalog/api/productsApi';
import { getPriceLists, getPriceListItems, setPriceListItemPrice, removePriceListItem } from '../api/priceListsApi';
import { getSales, createSale } from '../api/salesApi';

function emptyLine() {
  return { productId: '', quantity: '', discountPct: '0' };
}

export function useSales() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const isInventoryOperator = user?.role === 'inventory_operator';
  // RF-04: general_admin tiene "visibilidad y permisos totales" — puede
  // registrar ventas como inventory_operator, además de consultar como
  // cualquiera de los dos roles del módulo (mismo criterio ya aplicado en
  // Compras, sección 2.19).
  const canCreateSale = isInventoryOperator || isGeneralAdmin;

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branchId ? String(user.branchId) : '');
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('ventas');

  const [priceListId, setPriceListId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const [viewSale, setViewSale] = useState(null);

  const [editingPriceList, setEditingPriceList] = useState(null);
  const [priceListItems, setPriceListItems] = useState([]);
  const [priceListItemsLoading, setPriceListItemsLoading] = useState(false);
  const [priceListItemsError, setPriceListItemsError] = useState('');
  const [priceListItemSearch, setPriceListItemSearch] = useState('');
  const [savingProductId, setSavingProductId] = useState(null);

  async function loadReferenceData() {
    try {
      const [productsData, priceListsData] = await Promise.all([getProducts(), getPriceLists()]);
      setProducts(productsData);
      setPriceLists(priceListsData);

      // general_admin no tiene sucursal propia — mismo criterio que
      // useInventory.js/usePurchases.js: se le arma un valor por defecto con
      // la primera sucursal de la lista.
      if (isGeneralAdmin) {
        const branchesData = await getBranches();
        setBranches(branchesData);
        if (!branchId && branchesData.length > 0) {
          setBranchId(String(branchesData[0].id));
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar productos/listas de precio.');
    }
  }

  async function loadSales() {
    if (!branchId) return;

    setLoading(true);
    try {
      const data = await getSales(branchId);
      setSales(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las ventas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadSales();
  }, [branchId]);

  function resetSaleForm() {
    setPriceListId('');
    setCustomerName('');
    setLines([emptyLine()]);
  }

  function openSaleModal() {
    resetSaleForm();
    setFormError('');
    setFormSuccess('');
    setIsSaleModalOpen(true);
  }

  function closeSaleModal() {
    resetSaleForm();
    setFormError('');
    setFormSuccess('');
    setIsSaleModalOpen(false);
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

  async function handleCreateSale(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setFormError('Agregá al menos una línea con producto y cantidad.');
      return;
    }

    const dto = {
      priceListId: priceListId ? Number(priceListId) : null,
      customerName: customerName || null,
      items: validLines.map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        discountPct: Number(l.discountPct) || 0,
      })),
    };

    try {
      const sale = await createSale(branchId, dto);
      resetSaleForm();
      setFormSuccess(
        `Venta ${sale.saleNumber} registrada por un total de $${Number(sale.total).toLocaleString('es-CO')}.`
      );
      await loadSales();
    } catch (err) {
      setFormError(err.message || 'No se pudo registrar la venta.');
    }
  }

  function openComprobante(sale) {
    setViewSale(sale);
  }

  function closeComprobante() {
    setViewSale(null);
  }

  async function openPriceListEditor(priceList) {
    setEditingPriceList(priceList);
    setPriceListItemSearch('');
    setPriceListItemsError('');
    setPriceListItemsLoading(true);
    try {
      const items = await getPriceListItems(priceList.id);
      setPriceListItems(items);
    } catch (err) {
      setPriceListItemsError(err.message || 'No se pudieron cargar los productos de la lista.');
    } finally {
      setPriceListItemsLoading(false);
    }
  }

  function closePriceListEditor() {
    setEditingPriceList(null);
    setPriceListItems([]);
  }

  // Cambio local inmediato (sin guardar todavía) para que el input responda
  // al tipeo — el guardado real es explícito por fila (handleSavePrice),
  // mismo criterio que los formularios de umbral en Inventario.
  function updatePriceListItemDraft(productId, price) {
    setPriceListItems((prev) => prev.map((item) => (
      item.productId === productId ? { ...item, price } : item
    )));
  }

  async function handleSavePrice(productId, price) {
    if (price === '' || price === null || Number(price) < 0) {
      setPriceListItemsError('Ingresá un precio válido (mayor o igual a cero).');
      return;
    }

    setPriceListItemsError('');
    setSavingProductId(productId);
    try {
      await setPriceListItemPrice(editingPriceList.id, productId, Number(price));
      setPriceListItems((prev) => prev.map((item) => (
        item.productId === productId ? { ...item, price: Number(price) } : item
      )));
    } catch (err) {
      setPriceListItemsError(err.message || 'No se pudo guardar el precio.');
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleRemovePrice(productId) {
    setPriceListItemsError('');
    setSavingProductId(productId);
    try {
      await removePriceListItem(editingPriceList.id, productId);
      setPriceListItems((prev) => prev.map((item) => (
        item.productId === productId ? { ...item, price: null } : item
      )));
    } catch (err) {
      setPriceListItemsError(err.message || 'No se pudo quitar el precio.');
    } finally {
      setSavingProductId(null);
    }
  }

  const visiblePriceListItems = priceListItemSearch
    ? priceListItems.filter((item) => {
        const term = priceListItemSearch.trim().toLowerCase();
        return item.productName.toLowerCase().includes(term)
          || item.productSku.toLowerCase().includes(term);
      })
    : priceListItems;

  return {
    branches,
    branchId,
    setBranchId,
    isGeneralAdmin,
    canCreateSale,
    products,
    priceLists,
    sales,
    loading,
    error,

    tab,
    setTab,

    priceListId,
    setPriceListId,
    customerName,
    setCustomerName,
    lines,
    addLine,
    removeLine,
    updateLine,
    formError,
    formSuccess,
    handleCreateSale,
    isSaleModalOpen,
    openSaleModal,
    closeSaleModal,

    viewSale,
    openComprobante,
    closeComprobante,

    editingPriceList,
    priceListItems: visiblePriceListItems,
    priceListItemsLoading,
    priceListItemsError,
    priceListItemSearch,
    setPriceListItemSearch,
    savingProductId,
    openPriceListEditor,
    closePriceListEditor,
    updatePriceListItemDraft,
    handleSavePrice,
    handleRemovePrice,
  };
}
