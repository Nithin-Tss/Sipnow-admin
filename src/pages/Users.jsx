import CrudPage from "../components/CrudPage";
import { usersStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Full name", required: true, colSpan: 2 },
  { name: "email", label: "Email", type: "email", required: true, colSpan: 2 },
  { name: "password", label: "Password", type: "password" },
  { name: "phone", label: "Phone" },
  {
    name: "role",
    label: "Role",
    type: "select",
    default: "customer",
    options: [
      { value: "customer", label: "Customer" },
      { value: "admin", label: "Admin" },
    ],
  },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  {
    key: "role",
    label: "Role",
    render: (u) => <span className="capitalize">{u.role}</span>,
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
      searchFields={["name", "email"]}
      searchPlaceholder="Search users…"
    />
  );
}
