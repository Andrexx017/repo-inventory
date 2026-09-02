import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getProducts() {
  return getJson('/api/products');
}

export function getProductsPaged({ search, categoryId, baseUnitId, active, minPrice, maxPrice, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  if (categoryId) params.set('categoryId', categoryId);
  if (baseUnitId) params.set('baseUnitId', baseUnitId);
  if (active !== undefined) params.set('active', String(active));
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  return getJson(`/api/products/paged?${params}`);
}

export function createProduct(payload) {
  return postJson('/api/products', payload);
}

export function updateProduct(id, payload) {
  return putJson(`/api/products/${id}`, payload);
}

export function getProductCategories() {
  return getJson('/api/product-categories');
}

export function getUnitsOfMeasure() {
  return getJson('/api/units-of-measure');
}

export function createUnitOfMeasure(payload) {
  return postJson('/api/units-of-measure', payload);
}
