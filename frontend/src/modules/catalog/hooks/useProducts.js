import { useEffect, useState } from 'react';
import { getProducts } from '../api/productsApi';

export const ACTIVE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [active, setActive] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  async function load() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetFilters() {
    setSearch('');
    setCategoryId('');
    setBaseUnitId('');
    setActive('');
    setMinPrice('');
    setMaxPrice('');
  }

  // Categoría/unidad no tienen su propio endpoint (YAGNI, ver
  // frontend/docs/decisions.md) — las opciones del filtro se derivan de los
  // productos ya cargados en vez de pedirlas aparte.
  const categoryOptions = uniqueOptions(products, 'categoryId', 'categoryName');
  const baseUnitOptions = uniqueOptions(products, 'baseUnitId', 'baseUnitName');

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

    search, setSearch,
    categoryId, setCategoryId,
    baseUnitId, setBaseUnitId,
    active, setActive,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    resetFilters,

    categoryOptions,
    baseUnitOptions,
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
