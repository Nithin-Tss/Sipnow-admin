import { apiFetch } from "./apiClient";

export async function fetchBrands({
  search = "",
  page = 1,
  perPage = 20,
}) {
  const params = new URLSearchParams();

  params.set("all", "true");
  params.set("page", String(page));
  params.set("perPage", String(perPage));

  if (search) {
    params.set("search", search);
  }

  const response = await apiFetch(`/brands?${params.toString()}`);

  const brands = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.brands)
      ? response.brands
      : [];

  return {
    items: brands,
    total: response?.total ?? brands.length,
    totalPages: response?.totalPages ?? 1,
  };
}

export async function createBrand(body) {
  return apiFetch("/brands", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      description: body.description || "",
      logo: body.logo || "",
      bannerImage: body.bannerImage || "",
      bestSellingDescription: body.bestSellingDescription || "",
      bestRatedDescription: body.bestRatedDescription || "",
      collectionDescription: body.collectionDescription || "",
      isActive:
        body.isActive !== undefined
          ? Boolean(body.isActive)
          : true,
      verified:
        body.verified !== undefined
          ? Boolean(body.verified)
          : false,
    }),
  });
}

export async function updateBrand(id, body) {
  return apiFetch(`/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: body.name,
      description: body.description || "",
      logo: body.logo || "",
      bannerImage: body.bannerImage || "",
      bestSellingDescription: body.bestSellingDescription || "",
      bestRatedDescription: body.bestRatedDescription || "",
      collectionDescription: body.collectionDescription || "",
      isActive:
        body.isActive !== undefined
          ? Boolean(body.isActive)
          : true,
      verified:
        body.verified !== undefined
          ? Boolean(body.verified)
          : false,
    }),
  });
}

export async function deleteBrand(id) {
  return apiFetch(`/brands/${id}`, {
    method: "DELETE",
  });
}