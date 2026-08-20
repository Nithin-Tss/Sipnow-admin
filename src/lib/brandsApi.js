import { apiFetch } from "./apiClient";

export async function fetchBrands({
  search = "",
  page = 1,
  perPage = 20,
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  params.set("page", String(page));
  params.set("perPage", String(perPage));

  return apiFetch(`/brands?${params.toString()}`);
}

export async function createBrand(body) {
  return apiFetch("/brands", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBrand(id, body) {
  return apiFetch(`/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteBrand(id) {
  return apiFetch(`/brands/${id}`, {
    method: "DELETE",
  });
}