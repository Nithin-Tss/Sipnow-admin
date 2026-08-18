import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Promotions from "./Promotions";
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

const mockProduct = {
  id: "prod-1",
  sku: "SKU-1",
  name: "Cabernet Sauvignon",
  imageUrl: "https://example.com/wine.jpg",
  originalPrice: 25,
  packOf: 6,
  packPrice: 140,
  caseOf: 12,
  casePrice: 260,
  promotionType: "IN_STORE_PROMOTION",
  promotionPrice: 19.99,
  promotionPackPrice: null,
  promotionCasePrice: null,
};

const mockProduct2 = {
  id: "prod-2",
  sku: "SKU-2",
  name: "Chardonnay",
  imageUrl: "",
  originalPrice: 18,
  packOf: null,
  packPrice: null,
  caseOf: null,
  casePrice: null,
  promotionType: "NONE",
  promotionPrice: null,
  promotionPackPrice: null,
  promotionCasePrice: null,
};

function renderPromotions() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Promotions />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({
    products: [mockProduct],
    total: 1,
  });
  vi.mocked(api.put).mockResolvedValue({});
});

describe("Promotions page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderPromotions();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to load"));
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Failed to load")).toBeInTheDocument(),
    );
  });

  it("renders promoted products list", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    expect(screen.getByText("SKU-1")).toBeInTheDocument();
  });

  it("shows empty state when no products in promotion", async () => {
    vi.mocked(api.get).mockResolvedValue({ products: [], total: 0 });
    renderPromotions();
    await waitFor(() =>
      expect(
        screen.getByText(
          "No products in this promotion yet. Add one to get started.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("shows original and promotion price", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$19\.99/)).toBeInTheDocument();
  });

  it("shows placeholder icon when no imageUrl", async () => {
    vi.mocked(api.get).mockResolvedValue({
      products: [mockProduct2],
      total: 1,
    });
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Chardonnay")).toBeInTheDocument(),
    );
    expect(screen.queryByAltText("Chardonnay")).not.toBeInTheDocument();
  });

  it("switches tabs and resets to page 1", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Clearance Sale"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("promotionType=CLEARANCE"),
      ),
    );
  });

  it("opens Add Product modal and searches", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("limit=8")) {
        return Promise.resolve({ products: [mockProduct2], total: 1 });
      }
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or SKU…"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search by name or SKU…"),
      "Chard",
    );
    await waitFor(() =>
      expect(screen.getByText("Chardonnay")).toBeInTheDocument(),
    );
  });

  it("shows no products found message when search has no results", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("limit=8")) {
        return Promise.resolve({ products: [], total: 0 });
      }
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search by name or SKU…"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search by name or SKU…"),
      "zzz",
    );
    await waitFor(() =>
      expect(screen.getByText("No products found.")).toBeInTheDocument(),
    );
  });

  it("picks a search result and opens the assign modal", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("limit=8")) {
        return Promise.resolve({ products: [mockProduct2], total: 1 });
      }
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await userEvent.type(
      screen.getByPlaceholderText("Search by name or SKU…"),
      "Chard",
    );
    await waitFor(() =>
      expect(screen.getByText("Chardonnay")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Chardonnay"));
    await waitFor(() =>
      expect(screen.getByText("In-Store Promotion price")).toBeInTheDocument(),
    );
  });

  it("opens edit (assign) modal from list with prefilled price", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByText("In-Store Promotion price")).toBeInTheDocument(),
    );
    // Cabernet Sauvignon only sells as pack/case (packPrice set) — no
    // individual "Promotion Price" input, pack/case fields shown instead.
    expect(
      screen.queryByLabelText("Promotion Price (optional)"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Promotion Case Price/)).toBeInTheDocument();
  });

  it("shows pack and case price fields when product has pack/case", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Promotion Case Price/)).toBeInTheDocument();
  });

  it("saves assign with entered prices", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText(/Promotion Pack Price/), "120");
    await userEvent.type(screen.getByLabelText(/Promotion Case Price/), "225");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/products/prod-1",
        expect.objectContaining({
          promotionType: "IN_STORE_PROMOTION",
          promotionPrice: null,
          promotionPackPrice: 120,
          promotionCasePrice: 225,
        }),
      ),
    );
  });

  it("blocks save and shows an error when all price fields are cleared", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    // Cabernet Sauvignon has no promotionPackPrice/promotionCasePrice set
    // and no individual "Promotion Price" input (pack-only product), so the
    // form already has nothing filled in — Save should refuse immediately.
    const callsBefore = vi.mocked(api.put).mock.calls.length;
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(
        screen.getByText(/Enter at least one promotion price/),
      ).toBeInTheDocument(),
    );
    expect(api.put).toHaveBeenCalledTimes(callsBefore);
  });

  it("allows saving with only a pack price set", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText(/Promotion Pack Price/), "120");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/products/prod-1",
        expect.objectContaining({
          promotionPrice: null,
          promotionPackPrice: 120,
        }),
      ),
    );
  });

  it("hides the individual Promotion Price input for a pack-only product", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByLabelText("Promotion Price (optional)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/only sold as a pack\/case/)).toBeInTheDocument();
  });

  it("shows error message when save fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("Save failed"));
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Promotion Pack Price/)).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText(/Promotion Pack Price/), "120");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("Save failed")).toBeInTheDocument(),
    );
  });

  it("cancels assign modal on Cancel click", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() => expect(screen.getByText("Cancel")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(
        screen.queryByText("In-Store Promotion price"),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens Remove modal and confirms removal", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() =>
      expect(screen.getByText("Remove from promotion")).toBeInTheDocument(),
    );
    expect(screen.getByText(/"Cabernet Sauvignon"/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/products/prod-1",
        expect.objectContaining({ promotionType: "NONE" }),
      ),
    );
  });

  it("shows error message when remove fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("Remove failed"));
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() =>
      expect(screen.getByText("Remove from promotion")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() =>
      expect(screen.getByText("Remove failed")).toBeInTheDocument(),
    );
  });

  it("cancels remove modal on Cancel click", async () => {
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() =>
      expect(screen.getByText("Remove from promotion")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(
        screen.queryByText("Remove from promotion"),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows already-in-promotion badge for products with an existing promotion", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes("promotion-search")) {
        return Promise.resolve({ products: [mockProduct], total: 1 });
      }
      return Promise.resolve({ products: [mockProduct], total: 1 });
    });
    renderPromotions();
    await waitFor(() =>
      expect(screen.getByText("Cabernet Sauvignon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Product"));
    await userEvent.type(
      screen.getByPlaceholderText("Search by name or SKU…"),
      "Cab",
    );
    await waitFor(() =>
      expect(screen.getByText(/already in/)).toBeInTheDocument(),
    );
  });
});
