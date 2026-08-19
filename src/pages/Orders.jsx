import CrudPage from "../components/CrudPage";
import { ordersStore as store } from "../lib/entityStores";

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const fields = [
  { name: "customerName", label: "Customer name", required: true, colSpan: 2 },
  { name: "total", label: "Order total", type: "number", required: true },
  { name: "placedAt", label: "Placed on", type: "date" },
  {
    name: "status",
    label: "Status",
    type: "select",
    default: "pending",
    colSpan: 2,
    options: [
      { value: "pending", label: "Pending" },
      { value: "processing", label: "Processing" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
];

const columns = [
  { key: "customerName", label: "Customer" },
  {
    key: "total",
    label: "Total",
    render: (o) => `$${Number(o.total).toFixed(2)}`,
  },
  { key: "placedAt", label: "Placed" },
  {
    key: "status",
    label: "Status",
    render: (o) => (
      <span
        className={`px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[o.status] ?? "bg-gray-50 text-gray-700"}`}
      >
        {o.status}
      </span>
    ),
  },
];

export default function Orders() {
  return (
    <CrudPage
      title="Orders"
      entityName="Order"
      store={store}
      queryKey="orders"
      columns={columns}
      fields={fields}
      searchFields={["customerName", "status"]}
      searchPlaceholder="Search orders…"
    />
  );
}
