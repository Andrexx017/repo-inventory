import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getProducts() {
  return getJson('/api/products');
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
