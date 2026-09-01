import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from '../../../shared/apiClient';
import {
  getProducts, createProduct, updateProduct,
  getProductCategories, getUnitsOfMeasure, createUnitOfMeasure,
} from '../api/productsApi';

export const ACTIVE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

export function useProducts() {
  const user = getUser();
  const isGeneralAdmin = user?.role === 'general_admin';
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
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

  async function load() {
    try {
      const [productsData, categoriesData, unitsData] = await Promise.all([
        getProducts(),
        getProductCategories(),
        getUnitsOfMeasure(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    if (location.state?.search) {
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await load();
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

  // Categoría del filtro se deriva de los productos ya cargados (no hay
  // pantalla para crear categorías sueltas, así que solo tiene sentido
  // ofrecer las que ya están en uso).
  const categoryOptions = uniqueOptions(products, 'categoryId', 'categoryName');

  // Unidad base del filtro, en cambio, se deriva del catálogo completo de
  // unidades (no solo de las que ya usa algún producto) — así una unidad
  // recién creada en "Nueva unidad de medida" aparece en el filtro de
  // inmediato, aunque todavía no exista ningún producto con ella.
  const baseUnitOptions = units.map((u) => ({ id: u.id, name: u.name }));

  const filteredProducts = products.filter((product) => {
    const term = normalize(search);
    const matchesSearch = !term
      || normalize(product.sku).includes(term)
      || normalize(product.name).includes(term);

    const matchesCategory = !categoryId || String(product.categoryId) === categoryId;
    const matchesBaseUnit = !baseUnitId || String(product.baseUnitId) === baseUnitId;
    const matchesActive = active === '' || String(product.active) === active;

    const price = product.referencePrice;
    const matchesMinPrice = minPrice === '' || (price !== null && price >= Number(minPrice));
    const matchesMaxPrice = maxPrice === '' || (price !== null && price <= Number(maxPrice));

    return matchesSearch && matchesCategory && matchesBaseUnit && matchesActive && matchesMinPrice && matchesMaxPrice;
  });

  return {
    products: filteredProducts,
    totalCount: products.length,
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

// Sin esto, buscar "jabon" no encuentra "Jabón" — quita tildes/diacríticos
// antes de comparar, para que la búsqueda no dependa de que el usuario
// tipee el acento exacto.
function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function uniqueOptions(products, idKey, nameKey) {
  const seen = new Map();

  for (const product of products) {
    if (product[idKey] != null && !seen.has(product[idKey])) {
      seen.set(product[idKey], product[nameKey]);
    }
  }

  return Array.from(seen, ([id, name]) => ({ id, name }));
}
