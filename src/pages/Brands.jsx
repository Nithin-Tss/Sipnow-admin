import CrudPage from "../components/CrudPage";
import * as brandsApi from "../lib/brandsApi";

const fields = [
  {
    name: "section-details",
    label: "Brand Details",
    type: "section",
  },
  {
    name: "verified",
    label: "Verified",
    type: "checkbox",
    default: false,
  },
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
    label: "Logo Image URL",
    placeholder: "https://...",
    colSpan: 2,
  },
  {
    name: "section-content",
    label: "Frontend Brand Page",
    type: "section",
  },
  {
    name: "bannerImage",
    label: "Brand Banner Image URL",
    placeholder: "https://...",
    colSpan: 2,
  },
  {
    name: "bestSellingDescription",
    label: "Best Selling Section Description",
    type: "textarea",
    colSpan: 2,
  },
  {
    name: "bestRatedDescription",
    label: "Best Rated Section Description",
    type: "textarea",
    colSpan: 2,
  },
  {
    name: "collectionDescription",
    label: "Collection Section Description",
    type: "textarea",
    colSpan: 2,
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
  {
    key: "verified",
    label: "Verification",
    render: (brand) => (
      <div className="flex flex-col">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
            brand.verified
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {brand.verified ? "Verified" : "Unverified"}
        </span>

        {brand.verified && brand.verificationEmail && (
          <span className="text-[11px] text-gray-400 mt-1">
            {brand.verificationEmail}
          </span>
        )}
      </div>
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