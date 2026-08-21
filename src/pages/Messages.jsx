import CrudPage from "../components/CrudPage";
import { messagesStore as store } from "../lib/entityStores";

const STATUS_STYLES = {
  pending: "bg-blue-50 text-blue-700",
  "in-progress": "bg-yellow-50 text-yellow-700",
  resolved: "bg-green-50 text-green-700",
};

const fields = [
  {
    name: "status",
    label: "Status",
    type: "select",
    default: "pending",
    options: [
      { value: "pending", label: "Pending" },
      { value: "in-progress", label: "In progress" },
      { value: "resolved", label: "Resolved" },
    ],
  },
];

const columns = [
  { key: "fromName", label: "From" },
  { key: "fromEmail", label: "Email" },
  { key: "subject", label: "Subject" },
  { key: "body", label: "Message" },
  {
    key: "status",
    label: "Status",
    render: (m) => (
      <span
        className={`px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[m.status] ?? "bg-gray-50 text-gray-700"}`}
      >
        {m.status}
      </span>
    ),
  },
];

export default function Messages() {
  return (
    <CrudPage
      title="Messages"
      entityName="Message"
      store={store}
      queryKey="messages"
      columns={columns}
      fields={fields}
      searchFields={["fromName", "subject"]}
      searchPlaceholder="Search messages…"
      allowCreate={false}
    />
  );
}
