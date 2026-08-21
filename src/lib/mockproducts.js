import { apiFetch } from "./apiClient";

/* =========================================================
   PRODUCTS
   Real backend: GET /api/products?q=&page=&limit= (public) ->
   { items, total, page, totalPages }. This module keeps the
   original exported function names so existing callers
   (Dashboard, Compare, Stock) don't need to change, but now
   hits the real API instead of localStorage.
   ========================================================= */

export async function fetchAllProducts() {
  const data = await apiFetch("/products?limit=1000");
  return data.items ?? [];
}

export async function fetchProducts({ search = "", page = 1, perPage = 20 }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(perPage),
  });
  if (search.trim()) params.set("q", search.trim());
  const data = await apiFetch(`/products?${params.toString()}`);
  return { items: data.items, total: data.total, totalPages: data.totalPages };
}

export async function createProduct(body) {
  return apiFetch("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProduct(id, body) {
  return apiFetch(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}
