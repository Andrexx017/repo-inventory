import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from '../../../shared/apiClient';
import {
  getProductsPaged, createProduct, updateProduct,
  getProductCategories, getUnitsOfMeasure, createUnitOfMeasure,
} from '../api/productsApi';

export const ACTIVE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

const PRODUCTS_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function useProducts() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productsTotalCount, setProductsTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Llegar acá desde el buscador global de la topbar trae el término en
  // location.state — mismo patrón que location.state.productId en
  // useInventory.js desde el Dashboard.
  const [search, setSearch] = useState(location.state?.search ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [active, setActive] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Formulario de producto (alta/edición) — solo lo usa GeneralAdmin (RF-10).
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBaseUnitId, setFormBaseUnitId] = useState('');
  const [referencePrice, setReferencePrice] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Formulario de unidad de medida nueva (ej. "Mililitro"/"ML") — mismo criterio
  // que el de producto: solo GeneralAdmin la ve.
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbreviation, setNewUnitAbbreviation] = useState('');
  const [unitFormError, setUnitFormError] = useState('');
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // Filtros "debounced": search/categoryId/etc. se actualizan al tipear (inputs
  // controlados), pero el request al servidor espera a que el usuario deje de
  // tocarlos — antes filtrar era en memoria y no había costo de red por tecla,
  // ahora que el filtro es server-side sí lo hay.
  const [debouncedFilters, setDebouncedFilters] = useState({
    search: search, categoryId: '', baseUnitId: '', active: '', minPrice: '', maxPrice: '',
  });

  // Sin este guard, el efecto de abajo también corre en el montaje inicial y
  // termina agendando un segundo `loadProducts()` ~300ms después del primero
  // (mismos filtros, pero un objeto nuevo) — dos idas y vueltas de loading
  // en cadena se ven como un pestañeo. El primer fetch ya lo dispara el
  // efecto de `loadProducts` con el valor inicial de `debouncedFilters`.
  const isFirstFilterRun = useRef(true);

  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedFilters({ search, categoryId, baseUnitId, active, minPrice, maxPrice });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, categoryId, baseUnitId, active, minPrice, maxPrice]);

  // Volver a la página 1 cuando cambia algún filtro — evita quedar en una
  // página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setPage(1);
  }, [debouncedFilters]);

  async function loadReferenceData() {
    try {
      const [categoriesData, unitsData] = await Promise.all([
        getProductCategories(),
        getUnitsOfMeasure(),
      ]);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar categorías/unidades.');
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await getProductsPaged({
        search: debouncedFilters.search || undefined,
        categoryId: debouncedFilters.categoryId || undefined,
        baseUnitId: debouncedFilters.baseUnitId || undefined,
        active: debouncedFilters.active === '' ? undefined : debouncedFilters.active === 'true',
        minPrice: debouncedFilters.minPrice || undefined,
        maxPrice: debouncedFilters.maxPrice || undefined,
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
      });
      setProducts(data.items);
      setProductsTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();

    if (location.state?.search) {
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, page]);

  const productsTotalPages = Math.max(1, Math.ceil(productsTotalCount / PRODUCTS_PAGE_SIZE));

  function resetFilters() {
    setSearch('');
    setCategoryId('');
    setBaseUnitId('');
    setActive('');
    setMinPrice('');
    setMaxPrice('');
  }

  function resetProductForm() {
    setSku('');
    setName('');
    setDescription('');
    setFormCategoryId('');
    setFormBaseUnitId('');
    setReferencePrice('');
    setFormActive(true);
    setEditingId(null);
    setFormError('');
    setIsProductModalOpen(false);
  }

  function openCreateProductModal() {
    setSku('');
    setName('');
    setDescription('');
    setFormCategoryId('');
    setFormBaseUnitId('');
    setReferencePrice('');
    setFormActive(true);
    setEditingId(null);
    setFormError('');
    setIsProductModalOpen(true);
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    setFormError('');

    const payload = {
      name,
      description: description || null,
      categoryId: formCategoryId ? Number(formCategoryId) : null,
      baseUnitId: Number(formBaseUnitId),
      referencePrice: referencePrice !== '' ? Number(referencePrice) : null,
    };

    try {
      if (editingId === null) {
        await createProduct({ ...payload, sku });
      } else {
        await updateProduct(editingId, { ...payload, active: formActive });
      }

      resetProductForm();
      await loadProducts();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el producto.');
    }
  }

  function handleEditProduct(product) {
    setSku(product.sku);
    setName(product.name);
    setDescription(product.description || '');
    setFormCategoryId(product.categoryId ? String(product.categoryId) : '');
    setFormBaseUnitId(String(product.baseUnitId));
    setReferencePrice(product.referencePrice ?? '');
    setFormActive(product.active);
    setEditingId(product.id);
    setFormError('');
    setIsProductModalOpen(true);
  }

  function openUnitModal() {
    setNewUnitName('');
    setNewUnitAbbreviation('');
    setUnitFormError('');
    setIsUnitModalOpen(true);
  }

  function closeUnitModal() {
    setIsUnitModalOpen(false);
  }

  async function handleCreateUnit(e) {
    e.preventDefault();
    setUnitFormError('');

    try {
      await createUnitOfMeasure({ name: newUnitName, abbreviation: newUnitAbbreviation });
      setNewUnitName('');
      setNewUnitAbbreviation('');
      setIsUnitModalOpen(false);
      const unitsData = await getUnitsOfMeasure();
      setUnits(unitsData);
    } catch (err) {
      setUnitFormError(err.message || 'No se pudo crear la unidad de medida.');
    }
  }

  // Categoría del filtro: antes se derivaba solo de las categorías "en uso"
  // entre los productos ya cargados, pero ahora `products` es una página del
  // servidor (no el catálogo completo) — se deriva del catálogo completo de
  // categorías, mismo criterio que baseUnitOptions.
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  // Unidad base del filtro se deriva del catálogo completo de unidades (no
  // solo de las que ya usa algún producto) — así una unidad recién creada en
  // "Nueva unidad de medida" aparece en el filtro de inmediato, aunque
  // todavía no exista ningún producto con ella.
  const baseUnitOptions = units.map((u) => ({ id: u.id, name: u.name }));

  return {
    products,
    totalCount: productsTotalCount,
    page,
    setPage,
    totalPages: productsTotalPages,
    loading,
    error,
    isGeneralAdmin,

    search, setSearch,
    categoryId, setCategoryId,
    baseUnitId, setBaseUnitId,
    active, setActive,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    resetFilters,

    categoryOptions,
    baseUnitOptions,

    categories,
    units,

    sku, setSku,
    name, setName,
    description, setDescription,
    formCategoryId, setFormCategoryId,
    formBaseUnitId, setFormBaseUnitId,
    referencePrice, setReferencePrice,
    formActive, setFormActive,
    editingId,
    formError,
    isProductModalOpen,
    handleProductSubmit,
    handleEditProduct,
    openCreateProductModal,
    resetProductForm,

    newUnitName, setNewUnitName,
    newUnitAbbreviation, setNewUnitAbbreviation,
    unitFormError,
    isUnitModalOpen,
    openUnitModal,
    closeUnitModal,
    handleCreateUnit,
  };
}
