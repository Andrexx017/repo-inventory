import { getJson, postJson, putJson, deleteJson } from '../../../shared/apiClient';

export function getPriceLists() {
  return getJson('/api/price-lists');
}

export function createPriceList(priceList) {
  return postJson('/api/price-lists', priceList);
}

export function getPriceListItems(priceListId) {
  return getJson(`/api/price-lists/${priceListId}/items`);
}

export function setPriceListItemPrice(priceListId, productId, price) {
  return putJson(`/api/price-lists/${priceListId}/items/${productId}`, { price });
}

export function removePriceListItem(priceListId, productId) {
  return deleteJson(`/api/price-lists/${priceListId}/items/${productId}`);
}
