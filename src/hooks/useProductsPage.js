import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useProductsPage(
  queryKey,
  page,
  search,
  perPage,
  categoryId,
  isVerified,
  promotionType,
) {
  return useQuery({
    queryKey: [queryKey, page, search, categoryId, isVerified, promotionType],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(perPage),
      });
      if (search) params.set("q", search);
      if (categoryId) params.set("categoryId", categoryId);
      if (promotionType) params.set("promotionType", promotionType);
      // null = no filter (admin sees all); true/false = explicit filter
      if (isVerified === true) params.set("isVerified", "true");
      else if (isVerified === false) params.set("isVerified", "false");
      else params.set("isVerified", "all");
      return api.get(`/products?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}
