import CrudPage from "../components/CrudPage";
import { usersStore as store } from "../lib/entityStores";

const fields = [
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "email", label: "Email", type: "email", required: true, colSpan: 2 },
  {
    name: "role",
    label: "Role",
    type: "select",
    default: "store_owner",
    options: [
      { value: "admin", label: "Admin" },
      { value: "store_owner", label: "Store Owner" },
      { value: "staff", label: "Staff" },
    ],
  },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const columns = [
  {
    key: "name",
    label: "Name",
    render: (u) => `${u.firstName} ${u.lastName}`,
  },
  { key: "email", label: "Email" },
  {
    key: "role",
    label: "Role",
    render: (u) => (
      <span className="capitalize">{u.role.replace("_", " ")}</span>
    ),
  },
  {
    key: "active",
    label: "Status",
    render: (u) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          u.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {u.active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Users() {
  return (
    <CrudPage
      title="Users"
      entityName="User"
      store={store}
      queryKey="users"
      columns={columns}
      fields={fields}
      searchFields={["firstName", "lastName", "email"]}
      searchPlaceholder="Search users…"
    />
  );
}
