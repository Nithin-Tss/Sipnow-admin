import CrudPage from "../components/CrudPage";
import { categoriesStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Category name", required: true, colSpan: 2 },
  {
    name: "group",
    label: "Group",
    type: "select",
    default: "wine",
    options: [
      { value: "wine", label: "Wine" },
      { value: "spirits", label: "Spirits" },
      { value: "beer", label: "Beer" },
      { value: "offers", label: "Offers" },
    ],
  },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "name", label: "Name" },
  {
    key: "group",
    label: "Group",
    render: (c) => <span className="capitalize">{c.group}</span>,
  },
  { key: "description", label: "Description" },
];

export default function Catalogue() {
  return (
    <CrudPage
      title="Catalogue"
      entityName="Category"
      store={store}
      queryKey="categories"
      columns={columns}
      fields={fields}
      searchFields={["name", "group"]}
      searchPlaceholder="Search categories…"
    />
  );
}
