import CrudPage from "../components/CrudPage";
import { suppliersStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Supplier name", required: true, colSpan: 2 },
  { name: "contactEmail", label: "Contact email", type: "email", colSpan: 2 },
  { name: "phone", label: "Phone" },
  { name: "region", label: "Region" },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "contactEmail", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "region", label: "Region" },
];

export default function ProviderMaps() {
  return (
    <CrudPage
      title="Suppliers"
      entityName="Supplier"
      store={store}
      queryKey="suppliers"
      columns={columns}
      fields={fields}
      searchFields={["name", "region"]}
      searchPlaceholder="Search suppliers…"
    />
  );
}
