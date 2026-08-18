import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ProviderMaps from "./ProviderMaps";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

const mockSuppliers = [
  { id: "supp-1", name: "Dan Murphys", createdAt: "2024-01-01T00:00:00Z" },
  { id: "supp-2", name: "Acme Wines", createdAt: "2024-02-01T00:00:00Z" },
];

const mockMaps = [
  {
    id: "map-1",
    supplierId: "supp-1",
    supplierCode: "DM-001",
    notes: null,
    createdAt: "2024-06-01T00:00:00Z",
    product: { id: "prod-1", sku: "SKU001", name: "Barossa Shiraz" },
    supplier: { id: "supp-1", name: "Dan Murphys" },
  },
  {
    id: "map-2",
    supplierId: "supp-2",
    supplierCode: "AC-100",
    notes: "Red wine",
    createdAt: "2024-06-02T00:00:00Z",
    product: { id: "prod-2", sku: "SKU002", name: "Chardonnay" },
    supplier: { id: "supp-2", name: "Acme Wines" },
  },
];

const mockCatTree = [];

function renderProviderMaps() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProviderMaps />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation((path) => {
    if (path.includes("/admin/supplier-maps")) return Promise.resolve(mockMaps);
    if (path.includes("/admin/suppliers"))
      return Promise.resolve(mockSuppliers);
    if (path.includes("/admin/catalogue")) return Promise.resolve(mockCatTree);
    if (path.includes("/products"))
      return Promise.resolve({ products: [], total: 0 });
    return Promise.resolve([]);
  });
  vi.mocked(api.post).mockResolvedValue({ id: "new-id", name: "New Supplier" });
  vi.mocked(api.delete).mockResolvedValue(undefined);
});

describe("Suppliers page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderProviderMaps();
    expect(screen.getAllByText("Loading…")[0]).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument(),
    );
  });

  it("renders Suppliers section heading", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Suppliers")).toBeInTheDocument(),
    );
  });

  it("renders suppliers list", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Acme Wines")[0]).toBeInTheDocument();
  });

  it("shows supplier mapping count", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    expect(screen.getAllByText("1 codes")[0]).toBeInTheDocument();
  });

  it("shows 'No suppliers yet' when empty", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/admin/supplier-maps")) return Promise.resolve([]);
      if (path.includes("/admin/suppliers")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("No suppliers yet.")).toBeInTheDocument(),
    );
  });

  it("opens Add Supplier modal", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Supplier"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Supplier" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
    ).toBeInTheDocument();
  });

  it("shows validation error when saving supplier with empty name", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Supplier"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      ).toBeInTheDocument(),
    );
    const addProviderBtns = screen.getAllByText("Add Supplier", {
      selector: "button",
    });
    fireEvent.click(addProviderBtns[addProviderBtns.length - 1]);
    await waitFor(() =>
      expect(screen.getByText("Name is required")).toBeInTheDocument(),
    );
  });

  it("calls api.post to save new supplier", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Supplier"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      "New Supplier",
    );
    const addProviderBtns = screen.getAllByText("Add Supplier", {
      selector: "button",
    });
    fireEvent.click(addProviderBtns[addProviderBtns.length - 1]);
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/admin/suppliers", {
        name: "New Supplier",
      }),
    );
  });

  it("shows error when saving supplier fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Provider already exists"));
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Supplier"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      "Dan Murphys",
    );
    const addProviderBtns = screen.getAllByText("Add Supplier", {
      selector: "button",
    });
    fireEvent.click(addProviderBtns[addProviderBtns.length - 1]);
    await waitFor(() =>
      expect(screen.getByText("Provider already exists")).toBeInTheDocument(),
    );
  });

  it("calls api.delete when deleting supplier", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByTitle("Delete supplier")[0]);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith(
        "/admin/suppliers/supp-1",
      ),
    );
  });

  it("renders Supplier Mappings section", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Supplier Code Mappings")).toBeInTheDocument(),
    );
  });

  it("renders mapping list", async () => {
    renderProviderMaps();
    await waitFor(() => expect(screen.getByText("DM-001")).toBeInTheDocument());
    expect(screen.getByText("AC-100")).toBeInTheDocument();
  });

  it("shows product names in mappings", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("Chardonnay")).toBeInTheDocument();
  });

  it("shows 'No mappings yet' when mappings are empty", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/admin/supplier-maps")) return Promise.resolve([]);
      if (path.includes("/admin/suppliers"))
        return Promise.resolve(mockSuppliers);
      return Promise.resolve([]);
    });
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText(/No mappings yet/)).toBeInTheDocument(),
    );
  });

  it("opens Add Mapping modal", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Mapping"));
    await waitFor(() =>
      expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
    );
  });

  it("shows provider code is required validation error", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Mapping"));
    await waitFor(() =>
      expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
    );
    const addMappingBtns = screen.getAllByText("Add Mapping", {
      selector: "button",
    });
    fireEvent.click(addMappingBtns[addMappingBtns.length - 1]);
    await waitFor(() =>
      expect(screen.getByText("Please select a supplier")).toBeInTheDocument(),
    );
  });

  it("calls api.delete when deleting a mapping", async () => {
    renderProviderMaps();
    await waitFor(() => expect(screen.getByText("DM-001")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete mapping")[0]);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith(
        "/admin/supplier-maps/map-1",
      ),
    );
  });

  it("shows notes in mappings when present", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Red wine")).toBeInTheDocument(),
    );
  });

  it("shows — in notes column when notes is null", async () => {
    renderProviderMaps();
    await waitFor(() => expect(screen.getByText("DM-001")).toBeInTheDocument());
    // The first mapping has null notes, which renders as "—"
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows Import CSV button", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    expect(screen.getByText("Upload CSV")).toBeInTheDocument();
  });

  it("shows Download Template button", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("downloads template when button clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:url");
    const revokeObjectURL = vi.fn();
    const clickFn = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const origCreateElement = document.createElement.bind(document);
    const createElement = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "a")
          return {
            href: "",
            download: "",
            click: clickFn,
          };
        return origCreateElement(tag);
      });

    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getByText("Template")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Template"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();
    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("shows product SKU in mappings", async () => {
    renderProviderMaps();
    await waitFor(() => expect(screen.getByText("SKU001")).toBeInTheDocument());
    expect(screen.getByText("SKU002")).toBeInTheDocument();
  });

  it("closes Add Supplier modal when Cancel is clicked", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Supplier"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText("e.g. Acme Wines Pty Ltd"),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes Add Mapping modal when Cancel is clicked", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Mapping"));
    await waitFor(() =>
      expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(
        screen.queryByText("Add Supplier Mapping"),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows 'Please select a product' when provider and code filled but no product", async () => {
    renderProviderMaps();
    await waitFor(() =>
      expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Mapping"));
    await waitFor(() =>
      expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "supp-1" },
    });
    await userEvent.type(
      screen.getByPlaceholderText("e.g. SUPP001"),
      "NEW-001",
    );
    const addMappingBtns = screen.getAllByText("Add Mapping", {
      selector: "button",
    });
    fireEvent.click(addMappingBtns[addMappingBtns.length - 1]);
    await waitFor(() =>
      expect(screen.getByText("Please select a product")).toBeInTheDocument(),
    );
  });

  describe("product search in Add Mapping modal", () => {
    let _setTimeout;
    beforeEach(() => {
      _setTimeout = window.setTimeout.bind(window);
      vi.spyOn(window, "setTimeout").mockImplementation((fn, delay, ...args) =>
        _setTimeout(fn, delay === 300 ? 10 : delay, ...args),
      );
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("triggers API search when typing in product search field", async () => {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/products?search="))
          return Promise.resolve({
            products: [{ id: "prod-new", sku: "NEW001", name: "New Product" }],
          });
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        return Promise.resolve([]);
      });

      renderProviderMaps();
      await waitFor(() =>
        expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText("Add Mapping"));
      await waitFor(() =>
        expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
      );

      fireEvent.change(
        screen.getByPlaceholderText("Search product by name or SKU…"),
        {
          target: { value: "New" },
        },
      );

      await waitFor(() =>
        expect(vi.mocked(api.get)).toHaveBeenCalledWith(
          expect.stringContaining("/products?search=New"),
        ),
      );
    });

    it("shows product dropdown and allows selection", async () => {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/products?search="))
          return Promise.resolve({
            products: [{ id: "prod-new", sku: "NEW001", name: "New Product" }],
          });
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        return Promise.resolve([]);
      });

      renderProviderMaps();
      await waitFor(() =>
        expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText("Add Mapping"));
      await waitFor(() =>
        expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
      );

      const searchInput = await screen.findByPlaceholderText(
        "Search product by name or SKU…",
      );
      fireEvent.change(searchInput, {
        target: { value: "New" },
      });

      const newProductBtn = await screen.findByRole("button", {
        name: /New Product/,
      });
      fireEvent.click(newProductBtn);

      await screen.findByText(/Selected: New Product/);
    });

    it("saves mapping when all fields filled correctly", async () => {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/products?search="))
          return Promise.resolve({
            products: [{ id: "prod-new", sku: "NEW001", name: "New Product" }],
          });
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        return Promise.resolve([]);
      });
      vi.mocked(api.post).mockResolvedValue({ id: "new-map-id" });

      renderProviderMaps();
      await waitFor(() =>
        expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText("Add Mapping"));
      await waitFor(() =>
        expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
      );

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "supp-1" },
      });

      const prodSearchInput = await screen.findByPlaceholderText(
        "Search product by name or SKU…",
      );
      fireEvent.change(prodSearchInput, {
        target: { value: "New" },
      });

      const newProdBtn = await screen.findByRole("button", {
        name: /New Product/,
      });
      fireEvent.click(newProdBtn);

      const codeInput = await screen.findByPlaceholderText("e.g. SUPP001");
      await userEvent.type(codeInput, "NEW-001");

      const addMappingBtns = screen.getAllByText("Add Mapping", {
        selector: "button",
      });
      fireEvent.click(addMappingBtns[addMappingBtns.length - 1]);

      await waitFor(() =>
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          "/admin/supplier-maps",
          {
            supplierId: "supp-1",
            supplierCode: "NEW-001",
            productId: "prod-new",
            notes: null,
          },
        ),
      );
    });

    it("shows 'Supplier code is required' after provider and product selected", async () => {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/products?search="))
          return Promise.resolve({
            products: [{ id: "prod-new", sku: "NEW001", name: "New Product" }],
          });
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        return Promise.resolve([]);
      });

      renderProviderMaps();
      await waitFor(() =>
        expect(screen.getAllByText("Dan Murphys")[0]).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText("Add Mapping"));
      await waitFor(() =>
        expect(screen.getByText("Add Supplier Mapping")).toBeInTheDocument(),
      );

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "supp-1" },
      });

      const searchInput4 = await screen.findByPlaceholderText(
        "Search product by name or SKU…",
      );
      fireEvent.change(searchInput4, {
        target: { value: "New" },
      });

      const codeNewProdBtn = await screen.findByRole("button", {
        name: /New Product/,
      });
      fireEvent.click(codeNewProdBtn);

      // Don't type provider code
      const addMappingBtns = screen.getAllByText("Add Mapping", {
        selector: "button",
      });
      fireEvent.click(addMappingBtns[addMappingBtns.length - 1]);

      await screen.findByText("Supplier code is required");
    });
  });

  describe("CSV upload review modal", () => {
    const csvContent =
      "providerName,supplierCode,sku,notes\nDan Murphys,DM-001,SKU001,\n";

    function setupCsvMock(productFound = true) {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        if (path.includes("/products?search=")) {
          return Promise.resolve({
            products: productFound
              ? [{ id: "prod-1", sku: "SKU001", name: "Barossa Shiraz" }]
              : [],
          });
        }
        return Promise.resolve([]);
      });
    }

    async function openReviewModal() {
      renderProviderMaps();
      await screen.findByText("Supplier Code Mappings");
      await waitFor(() =>
        expect(screen.getAllByText("Dan Murphys").length).toBeGreaterThan(0),
      );
      const file = new File([csvContent], "maps.csv", { type: "text/csv" });
      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });
      await screen.findByText("Review CSV Import", undefined, {
        timeout: 5000,
      });
    }

    it("opens CSV review modal after uploading a CSV file", async () => {
      setupCsvMock();
      await openReviewModal();
      // DM-001 appears in both mapping table and review modal - just check at least one exists
      expect(screen.getAllByText("DM-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("SKU001").length).toBeGreaterThan(0);
    });

    it("shows existing provider checkmark when provider is found", async () => {
      setupCsvMock();
      await openReviewModal();
      await screen.findByText("Found in catalogue", undefined, {
        timeout: 3000,
      });
    });

    it("shows 'New product' form when product SKU is not found", async () => {
      setupCsvMock(false);
      await openReviewModal();
      await screen.findByText("New product — fill in details", undefined, {
        timeout: 3000,
      });
    });

    it("closes review modal when X button is clicked", async () => {
      setupCsvMock();
      await openReviewModal();
      const closeButtons = screen
        .getAllByRole("button")
        .filter((b) => !b.textContent?.trim());
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      await waitFor(() =>
        expect(screen.queryByText("Review CSV Import")).not.toBeInTheDocument(),
      );
    });

    it("saves CSV mappings when all rows have existing providers and products", async () => {
      setupCsvMock();
      vi.mocked(api.post).mockResolvedValue({ id: "new-map-id" });
      await openReviewModal();
      await screen.findByText("Found in catalogue", undefined, {
        timeout: 3000,
      });
      const importBtn = await screen.findByText("Import 1 mapping");
      fireEvent.click(importBtn);
      await waitFor(() =>
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          "/admin/supplier-maps",
          expect.objectContaining({
            supplierId: "supp-1",
            supplierCode: "DM-001",
          }),
        ),
      );
    });

    it("creates new provider when supplier name is not in catalogue", async () => {
      const newProvCsv =
        "providerName,supplierCode,sku,notes\nUnknown Provider,UP-001,SKU001,\n";
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.includes("/admin/supplier-maps"))
          return Promise.resolve(mockMaps);
        if (path.includes("/admin/suppliers"))
          return Promise.resolve(mockSuppliers);
        if (path.includes("/admin/catalogue"))
          return Promise.resolve(mockCatTree);
        if (path.includes("/products?search=")) {
          return Promise.resolve({
            products: [{ id: "prod-1", sku: "SKU001", name: "Barossa Shiraz" }],
          });
        }
        return Promise.resolve([]);
      });
      vi.mocked(api.post).mockResolvedValue({
        id: "new-prov-id",
        name: "Unknown Provider",
        createdAt: "2024-01-01T00:00:00Z",
      });

      renderProviderMaps();
      await screen.findByText("Supplier Code Mappings");
      const file = new File([newProvCsv], "maps.csv", { type: "text/csv" });
      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });
      await screen.findByText("Review CSV Import", undefined, {
        timeout: 5000,
      });
      await screen.findByText("Import 1 mapping");

      fireEvent.click(screen.getByText("Import 1 mapping"));
      await waitFor(() =>
        expect(vi.mocked(api.post)).toHaveBeenCalledWith("/admin/suppliers", {
          name: "Unknown Provider",
        }),
      );
    });

    it("shows row provider code and SKU in review table", async () => {
      setupCsvMock();
      await openReviewModal();
      expect(screen.getAllByText("DM-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("SKU001").length).toBeGreaterThan(0);
    });

    it("fills in new product name and price fields in CSV review modal", async () => {
      setupCsvMock(false); // product NOT found → shows new product form
      await openReviewModal();
      await screen.findByText("New product — fill in details", undefined, {
        timeout: 5000,
      });
      // The name input for the new product
      const nameInput = screen.getByPlaceholderText("Product name *");
      fireEvent.change(nameInput, { target: { value: "Barossa Merlot" } });
      // The price input
      const priceInput = screen.getByPlaceholderText(/Price \*/i);
      fireEvent.change(priceInput, { target: { value: "25.99" } });
      // Verify the inputs reflect the typed values (updateNewProduct was called)
      expect(nameInput).toHaveValue("Barossa Merlot");
      expect(priceInput).toHaveValue("25.99");
    });

    it("toggles new category input and calls saveNewCat", async () => {
      setupCsvMock(false); // product NOT found
      vi.mocked(api.post).mockImplementation((path) => {
        if (path === "/admin/catalogue")
          return Promise.resolve({ slug: "spirits", name: "Spirits" });
        return Promise.resolve({ id: "new-id" });
      });
      await openReviewModal();
      await screen.findByText("New product — fill in details");
      // Find the "+ New" button in the new-product category row
      const newBtns = screen
        .getAllByRole("button")
        .filter((b) => b.textContent?.trim() === "+ New");
      expect(newBtns.length).toBeGreaterThan(0);
      fireEvent.click(newBtns[0]); // toggles showNewCat for that row
      // A new category name input should appear with placeholder "New category name…"
      const newCatInput =
        await screen.findByPlaceholderText("New category name…");
      fireEvent.change(newCatInput, { target: { value: "Spirits" } });
      // Click "Add" to save
      const addBtns = screen
        .getAllByRole("button")
        .filter((b) => b.textContent?.trim() === "Add");
      if (addBtns.length > 0) {
        fireEvent.click(addBtns[addBtns.length - 1]);
        await waitFor(() =>
          expect(vi.mocked(api.post)).toHaveBeenCalledWith(
            "/admin/catalogue",
            expect.objectContaining({ name: "Spirits" }),
          ),
        );
      }
    });
  });
});
