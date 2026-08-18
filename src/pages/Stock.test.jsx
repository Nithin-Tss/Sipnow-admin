import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Stock from "./Stock";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

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

const mockProducts = [
  { id: "p-1", sku: "SKU001", name: "Red Wine", category: "Wines", stock: 50 },
  { id: "p-2", sku: "SKU002", name: "White Wine", category: "Wines", stock: 3 },
  { id: "p-3", sku: null, name: "Beer", category: "Beers", stock: 20 },
];

const mockUser = {
  id: "1",
  firstName: "Admin",
  lastName: "User",
  email: "admin@test.com",
  role: "admin",
};

function renderStock() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Stock />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.mocked(api.get).mockImplementation((url) => {
    if (url.includes("/admin/suppliers")) {
      return Promise.resolve([
        { id: "supp-1", name: "Supplier 1" },
        { id: "supp-2", name: "Supplier 2" },
      ]);
    }
    return Promise.resolve({ products: mockProducts, total: 3 });
  });
  vi.mocked(api.put).mockResolvedValue({});
});

describe("Stock page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderStock();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to load stock"));
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Failed to load stock")).toBeInTheDocument(),
    );
  });

  it("renders stock products list", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("White Wine")).toBeInTheDocument();
    expect(screen.getByText("Beer")).toBeInTheDocument();
  });

  it("shows SKU for each product", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("SKU001")).toBeInTheDocument();
    expect(screen.getByText("SKU002")).toBeInTheDocument();
  });

  it("shows — when product has no SKU", async () => {
    renderStock();
    await waitFor(() => expect(screen.getByText("Beer")).toBeInTheDocument());
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows stock quantities with units label", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("50 units")).toBeInTheDocument();
    expect(screen.getByText("3 units")).toBeInTheDocument();
    expect(screen.getByText("20 units")).toBeInTheDocument();
  });

  it("shows 'No products found' when empty", async () => {
    vi.mocked(api.get).mockResolvedValue({ products: [], total: 0 });
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("No products found")).toBeInTheDocument(),
    );
  });

  it("has a search input", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByPlaceholderText("Search products…")).toBeInTheDocument();
  });

  it("updates search query on input", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search products…"),
      "wine",
    );
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("q=wine"),
      ),
    );
  });

  it("shows Upload Stock CSV button", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("Upload Stock CSV")).toBeInTheDocument();
  });

  it("opens CSV import modal on Upload Stock CSV click", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("Upload Stock CSV")).toBeInTheDocument(); // Button exists
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    // Wait for modal content instead of the title (which will be ambiguous)
    await waitFor(() =>
      expect(
        screen.getByText(/Upload a CSV with your supplier codes/),
      ).toBeInTheDocument(),
    );
  });

  it("shows Template download button", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("shows Set Stock column header for admin", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("Set Stock")).toBeInTheDocument();
  });

  it("does NOT show Set Stock column for store_owner", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        firstName: "Owner",
        lastName: "Test",
        email: "o@test.com",
        role: "store_owner",
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Set Stock")).not.toBeInTheDocument();
  });

  it("shows Edit button for each product (admin only)", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBe(3);
  });

  it("shows inline stock editor when edit button is clicked", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() => {
      const input = screen.getByDisplayValue("50");
      expect(input).toBeInTheDocument();
    });
  });

  it("saves stock on Save button click", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    const input = await screen.findByDisplayValue("50");
    fireEvent.change(input, { target: { value: "60" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith("/products/p-1", {
        stock: 60,
      }),
    );
  });

  it("cancels edit when ✕ is clicked", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await screen.findByDisplayValue("50");
    fireEvent.click(screen.getByText("✕"));
    await waitFor(() =>
      expect(screen.queryByDisplayValue("50")).not.toBeInTheDocument(),
    );
  });

  it("shows Stock Management heading", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Stock Management")).toBeInTheDocument(),
    );
  });

  it("shows pagination when total exceeds per-page", async () => {
    vi.mocked(api.get).mockResolvedValue({
      products: Array.from({ length: 30 }, (_, i) => ({
        id: `p-${i}`,
        sku: `S${i}`,
        name: `Product ${i}`,
        category: "Wines",
        stock: 10,
      })),
      total: 60,
    });
    renderStock();
    await waitFor(() => expect(screen.getByText("← Prev")).toBeInTheDocument());
    expect(screen.getByText("Next →")).toBeInTheDocument();
  });

  it("clicking Next button advances to next page", async () => {
    vi.mocked(api.get).mockResolvedValue({
      products: Array.from({ length: 30 }, (_, i) => ({
        id: `p-${i}`,
        sku: `S${i}`,
        name: `Product ${i}`,
        category: "Wines",
        stock: 10,
      })),
      total: 60,
    });
    renderStock();
    await waitFor(() => expect(screen.getByText("Next →")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Next →"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
  });

  it("clicking Prev button goes back when on page 2", async () => {
    vi.mocked(api.get).mockResolvedValue({
      products: Array.from({ length: 30 }, (_, i) => ({
        id: `p-${i}`,
        sku: `S${i}`,
        name: `Product ${i}`,
        category: "Wines",
        stock: 10,
      })),
      total: 60,
    });
    renderStock();
    await waitFor(() => expect(screen.getByText("Next →")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Next →"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
    fireEvent.click(screen.getByText("← Prev"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
      ),
    );
  });

  it("CSV modal shows supplier dropdown with suppliers listed", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    await waitFor(() =>
      expect(screen.getByText("Supplier 1")).toBeInTheDocument(),
    );
    expect(screen.getByText("Supplier 2")).toBeInTheDocument();
  });

  it("CSV modal shows 'Select a supplier first' when no supplier selected", async () => {
    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    await waitFor(() =>
      expect(screen.getByText("Select a supplier first")).toBeInTheDocument(),
    );
  });

  it("CSV modal shows 'Click to select CSV file' after supplier is chosen", async () => {
    renderStock();
    await screen.findByText("Red Wine");
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    const supplierSelect = await screen.findByTestId("supplier-select");
    await screen.findByText("Supplier 1"); // wait for options to load
    await userEvent.selectOptions(supplierSelect, "supp-1");
    expect(
      await screen.findByText("Click to select CSV file"),
    ).toBeInTheDocument();
  });

  it("shows review modal after valid CSV file is uploaded", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("/admin/suppliers"))
        return Promise.resolve([{ id: "supp-1", name: "Supplier 1" }]);
      if (url.includes("/admin/supplier-maps")) return Promise.resolve([]);
      return Promise.resolve({ products: mockProducts, total: 3 });
    });
    vi.spyOn(window, "alert").mockImplementation(() => {});

    renderStock();
    await screen.findByText("Red Wine");
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    const supplierSelect = await screen.findByTestId("supplier-select");
    await screen.findByText("Supplier 1");
    await userEvent.selectOptions(supplierSelect, "supp-1");
    await screen.findByText("Click to select CSV file");

    const csvContent = "supplierCode,quantity\nDM-001,50\n";
    const file = new File([csvContent], "stock.csv", { type: "text/csv" });
    const fileInput = document.querySelector(
      'input[accept=".csv"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText("Review Stock Import", undefined, {
      timeout: 5000,
    });
    expect(screen.getByText("DM-001")).toBeInTheDocument();
  });

  it("review modal shows error when unmapped rows have no product selected", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("/admin/suppliers"))
        return Promise.resolve([{ id: "supp-1", name: "Supplier 1" }]);
      if (url.includes("/admin/supplier-maps")) return Promise.resolve([]);
      return Promise.resolve({ products: mockProducts, total: 3 });
    });
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(api.upload).mockResolvedValue({ updated: 0, errors: [] });

    renderStock();
    await screen.findByText("Red Wine");
    fireEvent.click(screen.getByText("Upload Stock CSV"));
    const supplierSelect = await screen.findByTestId("supplier-select");
    await screen.findByText("Supplier 1");
    await userEvent.selectOptions(supplierSelect, "supp-1");
    await screen.findByText("Click to select CSV file");

    const csvContent = "supplierCode,quantity\nDM-001,50\n";
    const file = new File([csvContent], "stock.csv", { type: "text/csv" });
    const fileInput = document.querySelector(
      'input[accept=".csv"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText("Review Stock Import", undefined, {
      timeout: 5000,
    });

    // Click Import button with unmapped rows - should show error
    fireEvent.click(screen.getByText(/Import 1 row/));
    expect(await screen.findByText(/Select a product for/)).toBeInTheDocument();
  });

  it("downloads template when Template button clicked", async () => {
    const mockRevokeObjectURL = vi.fn();
    const originalURL = globalThis.URL;
    globalThis.URL = {
      ...originalURL,
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: mockRevokeObjectURL,
    };

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");

    renderStock();
    await waitFor(() =>
      expect(screen.getByText("Template")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Template"));

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
    globalThis.URL = originalURL;
  });

  describe("review modal unmapped row search", () => {
    async function openReviewModalWithUnmappedRow() {
      vi.mocked(api.get).mockImplementation((url) => {
        if (url.includes("/admin/suppliers"))
          return Promise.resolve([{ id: "supp-1", name: "Supplier 1" }]);
        if (url.includes("/admin/supplier-maps")) return Promise.resolve([]);
        if (url.includes("/products?search="))
          return Promise.resolve({
            products: [{ id: "p-99", sku: "S99", name: "Found Product" }],
          });
        return Promise.resolve({ products: mockProducts, total: 3 });
      });
      renderStock();
      await screen.findByText("Red Wine");
      fireEvent.click(screen.getByText("Upload Stock CSV"));
      const sel = await screen.findByTestId("supplier-select");
      await screen.findByText("Supplier 1");
      await userEvent.selectOptions(sel, "supp-1");
      await screen.findByText("Click to select CSV file");
      const file = new File(
        ["supplierCode,quantity\nDM-001,50\n"],
        "stock.csv",
        { type: "text/csv" },
      );
      const fileInput = document.querySelector(
        'input[accept=".csv"]',
      );
      fireEvent.change(fileInput, { target: { files: [file] } });
      await screen.findByText("Review Stock Import", undefined, {
        timeout: 5000,
      });
    }

    it("closes review modal via Cancel button", async () => {
      vi.mocked(api.get).mockImplementation((url) => {
        if (url.includes("/admin/suppliers"))
          return Promise.resolve([{ id: "supp-1", name: "Supplier 1" }]);
        if (url.includes("/admin/supplier-maps")) return Promise.resolve([]);
        return Promise.resolve({ products: mockProducts, total: 3 });
      });
      renderStock();
      await screen.findByText("Red Wine");
      fireEvent.click(screen.getByText("Upload Stock CSV"));
      const sel = await screen.findByTestId("supplier-select");
      await screen.findByText("Supplier 1");
      await userEvent.selectOptions(sel, "supp-1");
      await screen.findByText("Click to select CSV file");
      const file = new File(
        ["supplierCode,quantity\nDM-001,50\n"],
        "stock.csv",
        { type: "text/csv" },
      );
      const fileInput = document.querySelector(
        'input[accept=".csv"]',
      );
      fireEvent.change(fileInput, { target: { files: [file] } });
      await screen.findByText("Review Stock Import", undefined, {
        timeout: 5000,
      });
      fireEvent.click(screen.getByText("Cancel"));
      await waitFor(() =>
        expect(
          screen.queryByText("Review Stock Import"),
        ).not.toBeInTheDocument(),
      );
    });

    it("shows search input for unmapped rows in review modal", async () => {
      await openReviewModalWithUnmappedRow();
      expect(
        screen.getByPlaceholderText("Search product to map…"),
      ).toBeInTheDocument();
    });

    it("shows amber warning about new mappings when unmapped rows exist", async () => {
      await openReviewModalWithUnmappedRow();
      expect(
        screen.getByText(
          "New mappings will be saved to Suppliers automatically.",
        ),
      ).toBeInTheDocument();
    });

    it("searches and shows product dropdown in unmapped row", async () => {
      const _setTimeout = window.setTimeout.bind(window);
      vi.spyOn(window, "setTimeout").mockImplementation(
        (fn, delay, ...args) =>
          _setTimeout(fn, delay === 300 ? 10 : delay, ...args),
      );
      await openReviewModalWithUnmappedRow();
      const searchInput = screen.getByPlaceholderText("Search product to map…");
      fireEvent.change(searchInput, { target: { value: "Found" } });
      expect(await screen.findByText("Found Product")).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("selects a product from dropdown and shows mapping confirmation", async () => {
      const _setTimeout = window.setTimeout.bind(window);
      vi.spyOn(window, "setTimeout").mockImplementation(
        (fn, delay, ...args) =>
          _setTimeout(fn, delay === 300 ? 10 : delay, ...args),
      );
      await openReviewModalWithUnmappedRow();
      const searchInput = screen.getByPlaceholderText("Search product to map…");
      fireEvent.change(searchInput, { target: { value: "Found" } });
      await screen.findByText("Found Product");
      fireEvent.click(screen.getByText("Found Product"));
      expect(
        await screen.findByText(/Will create mapping/),
      ).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });
});
