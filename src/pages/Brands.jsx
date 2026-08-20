import CrudPage from "../components/CrudPage";
import * as brandsApi from "../lib/brandsApi";

const fields = [
  {
    name: "name",
    label: "Brand Name",
    required: true,
    colSpan: 2,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    colSpan: 2,
  },
  {
    name: "logo",
    label: "Logo",
  },
  {
    name: "isActive",
    label: "Active",
    type: "checkbox",
    default: true,
  },
];

const columns = [
  {
    key: "name",
    label: "Brand Name",
  },
  {
    key: "slug",
    label: "Slug",
  },
  {
    key: "description",
    label: "Description",
  },
  {
    key: "isActive",
    label: "Status",
    render: (brand) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          brand.isActive
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        {brand.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

const store = {
  list: brandsApi.fetchBrands,
  create: brandsApi.createBrand,
  update: brandsApi.updateBrand,
  remove: brandsApi.deleteBrand,
};

export default function Brands() {
  return (
    <CrudPage
      title="Brands"
      entityName="Brand"
      store={store}
      queryKey="brands"
      columns={columns}
      fields={fields}
      searchFields={["name", "slug"]}
      searchPlaceholder="Search brands…"
    />
  );
}