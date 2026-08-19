import CrudPage from "../components/CrudPage";
import { reviewsStore as store } from "../lib/entityStores";

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const fields = [
  { name: "productName", label: "Product name", required: true, colSpan: 2 },
  { name: "customerName", label: "Customer name", required: true },
  { name: "rating", label: "Rating (1-5)", type: "number" },
  {
    name: "status",
    label: "Status",
    type: "select",
    default: "pending",
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
    ],
  },
  { name: "comment", label: "Comment", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "productName", label: "Product" },
  { key: "customerName", label: "Customer" },
  { key: "rating", label: "Rating", render: (r) => `${r.rating} / 5` },
  { key: "comment", label: "Comment" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <span
        className={`px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[r.status] ?? "bg-gray-50 text-gray-700"}`}
      >
        {r.status}
      </span>
    ),
  },
];

export default function Reviews() {
  return (
    <CrudPage
      title="Reviews"
      entityName="Review"
      store={store}
      queryKey="reviews"
      columns={columns}
      fields={fields}
      searchFields={["productName", "customerName"]}
      searchPlaceholder="Search reviews…"
    />
  );
}
