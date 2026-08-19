import CrudPage from "../components/CrudPage";
import { messagesStore as store } from "../lib/entityStores";

const STATUS_STYLES = {
  unread: "bg-blue-50 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  replied: "bg-green-50 text-green-700",
};

const fields = [
  { name: "fromName", label: "From name", required: true },
  { name: "fromEmail", label: "From email", type: "email" },
  { name: "subject", label: "Subject", required: true, colSpan: 2 },
  {
    name: "status",
    label: "Status",
    type: "select",
    default: "unread",
    options: [
      { value: "unread", label: "Unread" },
      { value: "read", label: "Read" },
      { value: "replied", label: "Replied" },
    ],
  },
  { name: "body", label: "Message", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "fromName", label: "From" },
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
    />
  );
}
