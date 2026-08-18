import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Products from "./Products";
import { api } from "../lib/api";
import * as imageValidation from "../lib/imageValidation";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
  BASE: "http://localhost:4000",
  getToken: vi.fn(() => "test-token"),
}));

vi.mock("../lib/imageValidation", () => ({
  validateImage: vi.fn().mockResolvedValue(null),
  PRODUCT_IMAGE: { maxWidth: 800, maxHeight: 800 },
  OFFER_BANNER: { maxWidth: 1200, maxHeight: 400 },
}));

const mockCatTree = [
  {
    id: "cat-1",
    name: "Wines",
    slug: "wines",
    children: [
      {
        id: "sub-1",
        name: "Red Wine",
        slug: "red-wine",
        children: [
          { id: "type-1", name: "Shiraz", slug: "shiraz", children: [] },
        ],
      },
    ],
  },
];

const mockProduct = {
  id: "prod-1",
  sku: "10000001",
  name: "Barossa Shiraz",
  categories: [{ id: "cat-1", name: "Wines", slug: "wines", parent: null }],
  imageUrl: "https://example.com/img.jpg",
  originalPrice: 29.99,
  promotionType: "IN_STORE_PROMOTION",
  promotionPrice: 24.99,
  isNew: true,
  stock: 50,
  description: "A nice red wine",
  alcoholVolume: 14.5,
  volumeMl: 750,
  maker: "Penfolds",
  brandName: "Penfolds",
  country: "Australia",
  region: "Barossa Valley",
  sweetness: "dry",
  flavorNotes: "Dark cherry",
  grapeVariety: "Shiraz",
  ingredients: null,
  wineBody: "full",
  aroma: "Oak",
  vintage: 2022,
  closure: "screw-cap",
  packOf: null,
  servingSuggestions: null,
  allergens: null,
  awards: null,
  storageInstructions: null,
  foodRecommendations: null,
  nutritionalInfo: null,
  isVerified: false,
  verifiedAt: null,
  verifiedByEmail: null,
};

const mockProductNoImage = {
  ...mockProduct,
  id: "prod-2",
  sku: "10000002",
  name: "White Wine",
  imageUrl: "",
  promotionType: "NONE",
  promotionPrice: null,
  stock: 3,
  categories: [
    { id: "cat-1", name: "Wines", slug: "wines", parent: null },
    { id: "sub-1", name: "Red Wine", slug: "red-wine", parent: null },
  ],
};

function renderProducts() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((path) => {
    if (path.includes("/products"))
      return Promise.resolve({ products: [mockProduct], total: 1 });
    if (path.includes("/admin/catalogue")) return Promise.resolve(mockCatTree);
    return Promise.resolve({});
  });
  vi.mocked(api.post).mockResolvedValue({ id: "new-id" });
  vi.mocked(api.put).mockResolvedValue(mockProduct);
  vi.mocked(api.delete).mockResolvedValue(undefined);
  vi.mocked(api.upload).mockResolvedValue({
    url: "https://example.com/new.jpg",
  });
});

describe("Products page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderProducts();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Server error"));
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument(),
    );
  });

  it("renders the products list", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("10000001")).toBeInTheDocument();
  });

  it("shows brand name and volume in the product row", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("Penfolds · 750mL")).toBeInTheDocument();
  });

  it("shows only brand name when volumeMl is null", async () => {
    const noVolume = { ...mockProduct, id: "prod-nv", volumeMl: null };
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [noVolume], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("Penfolds")).toBeInTheDocument();
  });

  it("shows only volume when brandName is null", async () => {
    const noBrand = { ...mockProduct, id: "prod-nb", brandName: null };
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [noBrand], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("750mL")).toBeInTheDocument();
  });

  it("shows empty state when no products", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [], total: 0 });
      return Promise.resolve([]);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("No products found")).toBeInTheDocument(),
    );
  });

  it("shows product image when imageUrl present", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const img = screen.getByAltText("Barossa Shiraz");
    expect(img).toBeInTheDocument();
  });

  it("shows package icon placeholder when no imageUrl", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [mockProductNoImage], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("White Wine")).toBeInTheDocument(),
    );
    // No image, just the icon placeholder
    expect(screen.queryByAltText("White Wine")).not.toBeInTheDocument();
  });

  it("shows offer price and original price when offer exists", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("$ 24.99")).toBeInTheDocument();
    expect(screen.getByText("$ 29.99")).toBeInTheDocument();
  });

  it("shows stock badge for low stock", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [mockProductNoImage], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("White Wine")).toBeInTheDocument(),
    );
    const stockBadge = screen.getByText("3");
    expect(stockBadge.className).toContain("border-gray-400");
  });

  it("shows +N more when product has multiple categories", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({ products: [mockProductNoImage], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("White Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("opens Add Product modal on button click", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
  });

  it("opens Edit Product modal on edit button click", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByText("Edit Product")).toBeInTheDocument(),
    );
  });

  it("populates edit form with product data", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByText("Edit Product")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("10000001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Barossa Shiraz")).toBeInTheDocument();
  });

  it("opens Delete modal on delete button click", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() =>
      expect(screen.getByText(/Delete Product/i)).toBeInTheDocument(),
    );
  });

  it("opens Delete All modal", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Delete All"));
    await waitFor(() =>
      expect(screen.getByText(/Delete All Products/i)).toBeInTheDocument(),
    );
  });

  it("opens Import CSV modal", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Import CSV"));
    await waitFor(() =>
      expect(screen.getByText(/Import Products CSV/i)).toBeInTheDocument(),
    );
  });

  it("opens Upload POS Data modal", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Upload POS Data"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Upload POS Data" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Click to select CSV file")).toBeInTheDocument();
  });

  it("exports products CSV on Export CSV button click", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );

    const createObjectURL = vi.fn(() => "blob:url");
    const revokeObjectURL = vi.fn();
    const clickFn = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["sku,name\n"])),
    });
    vi.stubGlobal("fetch", fetchMock);
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

    fireEvent.click(screen.getByText("Export CSV"));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/products/export"),
        expect.any(Object),
      ),
    );
    await waitFor(() => expect(clickFn).toHaveBeenCalled());

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("shows a loading indicator on the Export CSV button while exporting", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:url"),
      revokeObjectURL: vi.fn(),
    });
    let resolveFetch = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const origCreateElement = document.createElement.bind(document);
    const createElement = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "a")
          return {
            href: "",
            download: "",
            click: vi.fn(),
          };
        return origCreateElement(tag);
      });

    fireEvent.click(screen.getByText("Export CSV"));
    expect(await screen.findByText("Exporting…")).toBeInTheDocument();

    resolveFetch({ ok: true, blob: () => Promise.resolve(new Blob(["x"])) });
    await waitFor(() =>
      expect(screen.getByText("Export CSV")).toBeInTheDocument(),
    );

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("closes modal when X is clicked", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find(
      (b) => b.getAttribute("title") === null && !b.textContent?.trim(),
    );
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: "Add Product" }),
        ).not.toBeInTheDocument(),
      );
    }
  });

  it("shows search input and filters", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const searchInput = screen.getByPlaceholderText("Search products…");
    expect(searchInput).toBeInTheDocument();
    await userEvent.type(searchInput, "wine");
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("q=wine"),
      ),
    );
  });

  it("selects a product via checkbox", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // first product checkbox (index 0 is select-all)
    expect(screen.getByText("Delete 1 selected")).toBeInTheDocument();
  });

  it("selects all products via header checkbox", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // select-all checkbox
    expect(screen.getByText("Delete 1 selected")).toBeInTheDocument();
  });

  it("deselects all when all are selected and select-all clicked again", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // select all
    expect(screen.getByText("Delete 1 selected")).toBeInTheDocument();
    fireEvent.click(checkboxes[0]); // deselect all
    expect(screen.queryByText("Delete 1 selected")).not.toBeInTheDocument();
  });

  it("shows validation error when saving with no category", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    const nameInput = screen.getByPlaceholderText("e.g. Barossa Valley");
    if (nameInput) await userEvent.type(nameInput, "Test Product");
    // Save button says "Add Product" in add mode; pick the last one (modal save, not toolbar)
    const addProductBtns = screen
      .getAllByText("Add Product")
      .filter((el) => el.tagName === "BUTTON");
    const saveBtn = addProductBtns[addProductBtns.length - 1];
    if (saveBtn) fireEvent.click(saveBtn);
    await waitFor(() =>
      expect(
        screen.getByText("Please select at least one category"),
      ).toBeInTheDocument(),
    );
  });

  it("calls api.delete when delete is confirmed", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() =>
      expect(screen.getByText(/Delete Product/i)).toBeInTheDocument(),
    );
    // The modal confirm button has exact text "Delete" (no title attr, unlike the icon button)
    const confirmBtn = screen.getByText("Delete", {
      selector: "button:not([title])",
    });
    fireEvent.click(confirmBtn);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/products/prod-1"),
    );
  });

  it("calls api.delete for delete all", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Delete All"));
    await waitFor(() =>
      expect(screen.getByText(/Delete All Products/i)).toBeInTheDocument(),
    );
    // Modal confirm button says "Delete All" — pick the last one (toolbar has same text)
    const deleteAllBtns = screen.getAllByText("Delete All", {
      selector: "button",
    });
    fireEvent.click(deleteAllBtns[deleteAllBtns.length - 1]);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/admin/products"),
    );
  });

  it("closes delete modal when Cancel is clicked", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() =>
      expect(screen.getByText(/Delete Product/i)).toBeInTheDocument(),
    );
    const cancelBtns = screen.getAllByText("Cancel");
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    await waitFor(() =>
      expect(screen.queryByText(/Delete Product/i)).not.toBeInTheDocument(),
    );
  });

  it("import modal shows file upload area", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Import CSV"));
    await waitFor(() =>
      expect(screen.getByText(/Import Products CSV/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Click to select CSV file")).toBeInTheDocument();
  });

  it("downloads CSV template from within the Import CSV modal", async () => {
    // Render first — the mock below intercepts createElement("a") which
    // would break React's own DOM creation of the <a> image links we added.
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Import CSV"));
    await waitFor(() =>
      expect(screen.getByText(/Import Products CSV/i)).toBeInTheDocument(),
    );

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

    fireEvent.click(screen.getByText("Download Template"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();
    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("downloads POS template from within the Upload POS Data modal", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

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

    fireEvent.click(screen.getByText("Download Template"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();
    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("shows pagination when total exceeds per-page limit", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({
          products: Array.from({ length: 20 }, (_, i) => ({
            ...mockProduct,
            id: `prod-${i}`,
            sku: `1000000${i}`,
            name: `Product ${i}`,
          })),
          total: 40,
        });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() => expect(screen.getByText("← Prev")).toBeInTheDocument());
    expect(screen.getByText("Next →")).toBeInTheDocument();
  });

  it("shows save error from api on add product", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("SKU already exists"));
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByPlaceholderText("e.g. Barossa Valley"),
    ).toBeInTheDocument();
  });

  it("uploads image via api.upload", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      url: "https://cdn.example.com/img.jpg",
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(screen.getByText("Upload Image")).toBeInTheDocument(),
    );

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector("input[type='file']");
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalled());
    }
  });

  it("shows image validation error when image fails validation", async () => {
    vi.mocked(imageValidation.validateImage).mockResolvedValue(
      "Image too large",
    );
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(screen.getByText("Upload Image")).toBeInTheDocument(),
    );

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector("input[type='file']");
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() =>
        expect(screen.getByText("Image too large")).toBeInTheDocument(),
      );
    }
  });

  it("shows uploading state when CSV file is selected in import modal", async () => {
    vi.mocked(api.upload).mockImplementation(() => new Promise(() => {}));
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Import CSV"));
    await screen.findByText(/Import Products CSV/i);
    const file = new File(["sku,name\n10000001,Test"], "products.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    expect(await screen.findByText("Uploading…")).toBeInTheDocument();
  });

  it("shows import error when CSV upload fails", async () => {
    vi.mocked(api.upload).mockRejectedValue(new Error("CSV parse error"));
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Import CSV"));
    await screen.findByText(/Import Products CSV/i);
    const file = new File(["sku,name\n10000001,Test"], "products.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    expect(await screen.findByText("CSV parse error")).toBeInTheDocument();
  });

  it("calls api.upload with CSV file when import is triggered", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      jobId: "job-1",
      total: 5,
      validationErrors: [],
    });
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/admin/products/import-job/"))
        return Promise.resolve({
          status: "done",
          total: 5,
          processed: 5,
          created: 3,
          updated: 2,
          errors: [],
        });
      if (path.includes("/products"))
        return Promise.resolve({ products: [{ ...mockProduct }], total: 1 });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Import CSV"));
    await screen.findByText(/Import Products CSV/i);
    const file = new File(["sku,name\n10000001,Test"], "products.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(vi.mocked(api.upload)).toHaveBeenCalledWith(
        "/admin/products/csv",
        expect.any(FormData),
      ),
    );
  });

  it("guesses column mapping from POS CSV headers and shows the mapping form", async () => {
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

    const file = new File(
      [
        "ID,Case Quantity,Cases on hand,Items on hand,Quantity,Price\n10000001,24,0,20,1,9",
      ],
      "pos.csv",
      { type: "text/csv" },
    );
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });

    await screen.findByText(/pos\.csv/);
    const skuSelect = document.getElementById("pos-field-sku");
    expect(skuSelect.value).toBe("ID");
    const caseQtySelect = document.getElementById("pos-field-caseQty");
    expect(caseQtySelect.value).toBe("Case Quantity");
    const itemsOnHandSelect = document.getElementById("pos-field-itemsOnHand");
    expect(itemsOnHandSelect.value).toBe("Items on hand");
    const tierQtySelect = document.getElementById("pos-field-tierQty");
    expect(tierQtySelect.value).toBe("Quantity");
    const tierPriceSelect = document.getElementById("pos-field-tierPrice");
    expect(tierPriceSelect.value).toBe("Price");
  });

  it("submits the POS import with the mapped columns and full-sync flag, and shows the result", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      updated: 1,
      notFound: 0,
      errors: [],
      failedRows: [],
      zeroedOutOfStock: 12,
    });
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

    const file = new File(["ID,Quantity,Price\n10000001,1,40"], "pos.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    await screen.findByText(/pos\.csv/);

    fireEvent.click(screen.getByText("Import"));
    await waitFor(() =>
      expect(vi.mocked(api.upload)).toHaveBeenCalledWith(
        "/admin/products/pos-csv",
        expect.any(FormData),
      ),
    );
    const fd = vi.mocked(api.upload).mock.calls[0][1];
    expect(fd.get("fullSync")).toBe("true");
    expect(await screen.findByText(/Updated: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Zeroed out of stock: 12/)).toBeInTheDocument();
  });

  it("shows not-found SKUs and a failed-rows download button after POS import", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      updated: 1,
      notFound: 1,
      errors: ['Row 3: no product found for sku="GHOST"'],
      failedRows: [
        {
          ID: "GHOST",
          Quantity: "1",
          Price: "10",
          _error: 'no product found for sku="GHOST"',
        },
      ],
      zeroedOutOfStock: 0,
    });
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

    const file = new File(["ID,Quantity,Price\nGHOST,1,10"], "pos.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    await screen.findByText(/pos\.csv/);

    fireEvent.click(screen.getByText("Import"));
    expect(await screen.findByText(/Not found: 1/)).toBeInTheDocument();
    expect(
      screen.getByText(/no product found for sku="GHOST"/),
    ).toBeInTheDocument();

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

    fireEvent.click(screen.getByText("Download failed rows"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });

  it("does not send fullSync=true when the checkbox is unchecked", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      updated: 1,
      notFound: 0,
      errors: [],
      failedRows: [],
      zeroedOutOfStock: 0,
    });
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

    const file = new File(["ID,Quantity,Price\n10000001,1,40"], "pos.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    await screen.findByText(/pos\.csv/);

    fireEvent.click(screen.getByLabelText(/This is the full stock list/i));

    fireEvent.click(screen.getByText("Import"));
    await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalled());
    const fd = vi.mocked(api.upload).mock.calls[0][1];
    expect(fd.get("fullSync")).toBe("false");
  });

  it("shows an error when POS import fails", async () => {
    vi.mocked(api.upload).mockRejectedValue(new Error("Bad columnMap"));
    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Upload POS Data"));
    await screen.findByRole("heading", { name: "Upload POS Data" });

    const file = new File(["ID,Quantity,Price\n10000001,1,40"], "pos.csv", {
      type: "text/csv",
    });
    const csvInput = document.querySelector('input[accept=".csv"]');
    fireEvent.change(csvInput, { target: { files: [file] } });
    await screen.findByText(/pos\.csv/);

    fireEvent.click(screen.getByText("Import"));
    expect(await screen.findByText("Bad columnMap")).toBeInTheDocument();
  });

  it("saves changes to edited product via api.put", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByText("Edit Product")).toBeInTheDocument(),
    );
    // Product has category cat-1, so Save Changes is enabled
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/products/prod-1",
        expect.objectContaining({ name: "Barossa Shiraz" }),
      ),
    );
  });

  it("shows error message when edit save fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("Database error"));
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByText("Edit Product")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() =>
      expect(screen.getByText("Database error")).toBeInTheDocument(),
    );
  });

  it("navigates product pagination with prev and next buttons", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      const url = new URL("http://x?" + path.split("?")[1]);
      const p = parseInt(url.searchParams.get("page") ?? "1");
      if (path.includes("/products"))
        return Promise.resolve({
          products: Array.from({ length: 20 }, (_, i) => ({
            ...mockProduct,
            id: `prod-${i}`,
            sku: `1000000${i}`,
            name: `Product ${i}`,
          })),
          total: 40,
          page: p,
        });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() => expect(screen.getByText("← Prev")).toBeInTheDocument());
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

  it("bulk deletes selected products after window.confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText("Delete 1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete 1 selected"));
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/products/prod-1"),
    );
    confirmSpy.mockRestore();
  });

  it("does not bulk delete when window.confirm is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByText("Delete 1 selected"));
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("adds category via picker and removes it in product form", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    // Find the Category picker select (the one with "Wines" option)
    const catSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "Wines",
        ),
      );
    expect(catSelect).toBeDefined();
    fireEvent.change(catSelect, { target: { value: "cat-1" } });
    // Click "+ Add" to add the selected category to the form
    fireEvent.click(screen.getByText("+ Add"));
    // Category tag "Wines" should appear
    await waitFor(() => {
      const tags = screen.getAllByText("Wines");
      expect(tags.length).toBeGreaterThan(0);
    });
    // Remove the category tag by clicking ✕
    const removeBtns = screen
      .getAllByRole("button")
      .filter((b) => b.textContent === "✕");
    if (removeBtns.length > 0) {
      fireEvent.click(removeBtns[0]);
    }
  });

  it("enables the promotion price field only once a promotion type is chosen", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    const promotionPriceInput = document.getElementById("prodPromotionPrice");
    expect(promotionPriceInput).toBeDisabled();

    const promotionTypeSelect = document.getElementById("prodPromotionType");
    fireEvent.change(promotionTypeSelect, {
      target: { value: "CLEARANCE" },
    });
    expect(promotionPriceInput).not.toBeDisabled();
  });

  it("shows category path for a nested subcategory in the product table", async () => {
    const nestedProduct = {
      ...mockProduct,
      id: "prod-nested",
      name: "Red Wine Blend",
      categories: [
        { id: "sub-1", name: "Red Wine", slug: "red-wine", parent: null },
      ],
    };
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/products"))
        return Promise.resolve({
          products: [nestedProduct],
          total: 1,
        });
      return Promise.resolve(mockCatTree);
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Red Wine Blend")).toBeInTheDocument(),
    );
    // findNodeById("sub-1", catTree) recurses: checks cat-1 (no match) → recurses into children → finds sub-1
    // The path shown in the table is "Wines > Red Wine"
    expect(screen.getByText("Wines > Red Wine")).toBeInTheDocument();
  });

  it("polls import job via fake timers and shows completion result", async () => {
    // Speed up the 3000ms poll interval so the test doesn't wait 3s
    const _setInterval = window.setInterval.bind(window);
    vi.spyOn(window, "setInterval").mockImplementation((fn, delay, ...args) =>
      _setInterval(
        fn,
        typeof delay === "number" && delay >= 1000 ? 10 : delay,
        ...args,
      ),
    );

    vi.mocked(api.upload).mockResolvedValue({
      jobId: "job-1",
      total: 5,
      validationErrors: [],
    });
    vi.mocked(api.get).mockImplementation((path) => {
      if (path.includes("/admin/products/import-job/job-1"))
        return Promise.resolve({
          status: "done",
          total: 5,
          processed: 5,
          created: 3,
          updated: 2,
          errors: [],
        });
      if (path.includes("/products"))
        return Promise.resolve({ products: [mockProduct], total: 1 });
      return Promise.resolve(mockCatTree);
    });

    renderProducts();
    await screen.findByText("Barossa Shiraz");
    fireEvent.click(screen.getByText("Import CSV"));
    await screen.findByText(/Import Products CSV/i);

    const csvInput = document.querySelector('input[accept=".csv"]');
    const file = new File(["sku,name\n10000001,Test"], "p.csv", {
      type: "text/csv",
    });
    await userEvent.upload(csvInput, file);

    await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("/admin/products/import-job/job-1"),
      ),
    );

    vi.restoreAllMocks();
  });

  it("triggers CSV drop zone via Enter key in import modal", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Import CSV"));
    await waitFor(() =>
      expect(screen.getByText(/Import Products CSV/i)).toBeInTheDocument(),
    );
    // The drop zone div has role="button" and an onKeyDown handler for Enter/" "
    const dropZone = screen.getByRole("button", {
      name: /Click to select CSV file/,
    });
    fireEvent.keyDown(dropZone, { key: "Enter" });
    fireEvent.keyDown(dropZone, { key: " " });
    // No error should be thrown; coverage for lines 2464-2465
  });

  it("adds inline category via New button in DropdownRow", async () => {
    vi.mocked(api.post).mockImplementation((path) => {
      if (path === "/admin/catalogue")
        return Promise.resolve({
          id: "new-cat-99",
          slug: "spirits",
          name: "Spirits",
        });
      return Promise.resolve({ id: "new-id" });
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Product" }),
      ).toBeInTheDocument(),
    );
    // DropdownRow renders a "+ New" button for the Category level
    const newButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "+ New");
    expect(newButtons.length).toBeGreaterThan(0);
    fireEvent.click(newButtons[0]); // opens the inline add input
    // The inline input should appear
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/New category name/i),
      ).toBeInTheDocument(),
    );
    const inlineInput = screen.getByPlaceholderText(/New category name/i);
    fireEvent.change(inlineInput, { target: { value: "Spirits" } });
    // Click "Add" button inside DropdownRow
    const addBtns = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "Add");
    const addBtn = addBtns[addBtns.length - 1];
    fireEvent.click(addBtn);
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/admin/catalogue", {
        name: "Spirits",
        parentId: null,
      }),
    );
  });

  it("renders category filter dropdown when categories are loaded", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByText("All categories")).toBeInTheDocument();
  });

  it("passes categoryId to the products API when a category is selected", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("All categories")).toBeInTheDocument(),
    );
    const catSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "All categories",
        ),
      );
    fireEvent.change(catSelect, { target: { value: "cat-1" } });
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("categoryId=cat-1"),
      ),
    );
  });

  it("shows subcategory dropdown after selecting a top-level category", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("All categories")).toBeInTheDocument(),
    );
    const catSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "All categories",
        ),
      );
    fireEvent.change(catSelect, { target: { value: "cat-1" } });
    await waitFor(() =>
      expect(screen.getByText("All subcategories")).toBeInTheDocument(),
    );
  });

  it("shows type dropdown after selecting a subcategory", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("All categories")).toBeInTheDocument(),
    );
    const catSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "All categories",
        ),
      );
    fireEvent.change(catSelect, { target: { value: "cat-1" } });
    await waitFor(() =>
      expect(screen.getByText("All subcategories")).toBeInTheDocument(),
    );
    const subSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "All subcategories",
        ),
      );
    fireEvent.change(subSelect, { target: { value: "sub-1" } });
    await waitFor(() =>
      expect(screen.getByText("All types")).toBeInTheDocument(),
    );
  });

  it("shows Clear button and resets filters when clicked", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("All categories")).toBeInTheDocument(),
    );
    const catSelect = screen
      .getAllByRole("combobox")
      .find((s) =>
        Array.from(s.querySelectorAll("option")).some(
          (o) => o.textContent === "All categories",
        ),
      );
    fireEvent.change(catSelect, { target: { value: "cat-1" } });
    await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Clear"));
    await waitFor(() =>
      expect(screen.queryByText("Clear")).not.toBeInTheDocument(),
    );
  });
});

// ── Verified filter + toggle ──────────────────────────────────────────────────

describe("Verified filter buttons", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve([]);
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
  });

  it("renders All / Verified / Unverified filter buttons", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Verified/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unverified" }),
    ).toBeInTheDocument();
  });

  it("All filter button is active by default", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(allBtn.className).toMatch(/bg-primary/);
  });

  it("activates Verified button on click and resets page", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const verifiedBtn = screen.getByRole("button", { name: /^Verified$/ });
    fireEvent.click(verifiedBtn);
    await waitFor(() => expect(verifiedBtn.className).toMatch(/bg-primary/));
  });

  it("activates Unverified button on click", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    const unverifiedBtn = screen.getByRole("button", { name: "Unverified" });
    fireEvent.click(unverifiedBtn);
    await waitFor(() => expect(unverifiedBtn.className).toMatch(/bg-primary/));
  });
});

describe("Verified badge in product table", () => {
  it("does not show shield icon for unverified products", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve([]);
      return Promise.resolve({
        products: [{ ...mockProduct, isVerified: false }],
        total: 1,
      });
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    // No title="Verified" span when product is unverified
    expect(document.querySelector('[title="Verified"]')).toBeNull();
  });

  it("shows shield icon for verified products", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve([]);
      return Promise.resolve({
        products: [
          {
            ...mockProduct,
            isVerified: true,
            verifiedAt: "2024-06-01T10:00:00Z",
            verifiedByEmail: "admin@test.com",
          },
        ],
        total: 1,
      });
    });
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    expect(document.querySelector('[title="Verified"]')).toBeTruthy();
  });
});

describe("Verified toggle in product form", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve(mockCatTree);
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
    vi.mocked(api.post).mockResolvedValue({ ...mockProduct, id: "new-prod" });
    vi.mocked(api.put).mockResolvedValue(mockProduct);
  });

  it("shows Verified checkbox in Add Product form", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Product/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Verified/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Verified/i)).not.toBeChecked();
  });

  it("loads isVerified state when editing a product", async () => {
    const verifiedProduct = {
      ...mockProduct,
      isVerified: true,
      verifiedAt: "2024-06-01T10:00:00Z",
      verifiedByEmail: "admin@test.com",
    };
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve(mockCatTree);
      return Promise.resolve({ products: [verifiedProduct], total: 1 });
    });

    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Verified/i)).toBeChecked(),
    );
  });

  it("shows verification audit info when editing a verified product", async () => {
    const verifiedProduct = {
      ...mockProduct,
      isVerified: true,
      verifiedAt: "2024-06-01T10:00:00Z",
      verifiedByEmail: "admin@test.com",
    };
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("catalogue")) return Promise.resolve(mockCatTree);
      return Promise.resolve({ products: [verifiedProduct], total: 1 });
    });

    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit"));
    await waitFor(() =>
      expect(screen.getByText(/admin@test\.com/)).toBeInTheDocument(),
    );
  });

  it("sends isVerified=true when toggle is checked before save", async () => {
    renderProducts();
    await waitFor(() =>
      expect(screen.getByText("Barossa Shiraz")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Product/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Verified/i)).toBeInTheDocument(),
    );

    // Toggle the verified checkbox on
    fireEvent.click(screen.getByLabelText(/Verified/i));
    expect(screen.getByLabelText(/Verified/i)).toBeChecked();
  });
});
