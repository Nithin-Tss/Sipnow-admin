import { apiFetch } from "./apiClient";

export async function fetchInStorePromotions() {
  const data = await apiFetch("/in-store-promotions");
  return data.items || [];
}

export async function createInStorePromotion(body) {
  return apiFetch("/in-store-promotions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateInStorePromotion(id, body) {
  return apiFetch(`/in-store-promotions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteInStorePromotion(id) {
  return apiFetch(`/in-store-promotions/${id}`, {
    method: "DELETE",
  });
}
