import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import CrudPage from "../components/CrudPage";
import { offersStore as store } from "../lib/entityStores";
import { fetchAllProducts } from "../lib/productsApi";

const baseFields = [
  { name: "title", label: "Offer title", required: true, colSpan: 2 },
  { name: "code", label: "Offer code" },
  {
    name: "discountType",
    label: "Discount type",
    type: "select",
    default: "percentage",
    options: [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed amount" },
    ],
  },
  {
    name: "discountValue",
    label: "Discount value",
    required: true,
    type: "number",
  },
  { name: "minimumPurchase", label: "Minimum purchase", type: "number", default: 0   },
  { name: "maximumDiscount", label: "Maximum discount", type: "number" },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "code", label: "Code", render: (o) => o.code || "—" },
  {
    key: "discount",
    label: "Discount",
    render: (o) =>
      o.discountType === "percentage"
        ? `${o.discountValue}%`
        : `$${Number(o.discountValue || 0).toFixed(2)}`,
  },
  {
    key: "isActive",
    label: "Status",
    render: (o) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          o.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {o.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Offers() {
  const { data: allProducts = [] } = useQuery({
    queryKey: ["allProductsForOffers"],
    queryFn: fetchAllProducts,
  });

  /*
   * Product options are loaded live so the saved ids are real Product ids.
   * Only verified products are offered — unverified ones aren't shown on the
   * storefront catalog, so promoting them would never actually display.
   */
  const fields = useMemo(
    () => [
      ...baseFields,
      {
        name: "applicableProducts",
        label: "Products in this promotion",
        type: "multiselect",
        options: allProducts
          .filter((product) => product.verified === true)
          .map((product) => ({
            value: product._id,
            label: `${product.name}${product.sku ? ` (${product.sku})` : ""} - $${Number(
              product.price,
            ).toFixed(2)}`,
          })),
      },
    ],
    [allProducts],
  );

  return (
    <CrudPage
      title="General Promotions"
      entityName="Offer"
      store={store}
      queryKey="offers"
      columns={columns}
      fields={fields}
      searchFields={["title", "code"]}
      searchPlaceholder="Search offers…"
    />
  );
}
