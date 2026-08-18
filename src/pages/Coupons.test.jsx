import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Coupons from "./Coupons";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_COUPONS = [
  {
    id: "c1",
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10,
    minOrderAmount: null,
    maxUses: 100,
    usedCount: 42,
    expiresAt: null,
    isActive: true,
    scope: "SITEWIDE",
    products: [],
    _count: { orders: 42 },
  },
  {
    id: "c2",
    code: "FLAT50",
    type: "FIXED",
    value: 50,
    minOrderAmount: 200,
    maxUses: null,
    usedCount: 0,
    expiresAt: "2020-01-01T00:00:00.000Z", // in the past → expired
    isActive: true,
    scope: "SPECIFIC_PRODUCTS",
    products: [
      {
        productId: "p1",
        product: { id: "p1", name: "Asahi Beer", sku: "ASH-001" },
      },
    ],
    _count: { orders: 0 },
  },
  {
    id: "c3",
    code: "DISABLED",
    type: "PERCENTAGE",
    value: 5,
    minOrderAmount: null,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    isActive: false,
    scope: "SITEWIDE",
    products: [],
    _count: { orders: 0 },
  },
];

const MOCK_PRODUCTS = [
  { id: "p1", name: "Asahi Beer", sku: "ASH-001" },
  { id: "p2", name: "Asahi Super Dry", sku: "ASH-002" },
];

function renderCoupons() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Coupons />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const MOCK_FEATURED = {
  id: 1,
  couponId: "c1",
  displayText: "Use SAVE10 for 10% off!",
  coupon: MOCK_COUPONS[0],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((path) => {
    if (path.startsWith("/products")) {
      return Promise.resolve({ products: MOCK_PRODUCTS });
    }
    if (path === "/coupons/featured") {
      return Promise.resolve(null);
    }
    return Promise.resolve(MOCK_COUPONS);
  });
  vi.mocked(api.post).mockResolvedValue({ id: "new-coupon" });
  vi.mocked(api.put).mockResolvedValue({});
  vi.mocked(api.delete).mockResolvedValue(undefined);
});

describe("Coupons page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderCoupons();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    renderCoupons();
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument(),
    );
  });

  it("renders coupon codes in table", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    expect(screen.getByText("FLAT50")).toBeInTheDocument();
    expect(screen.getByText("DISABLED")).toBeInTheDocument();
  });

  it("shows empty state when no coupons exist", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderCoupons();
    await waitFor(() =>
      expect(
        screen.getByText("No coupons yet. Create one to get started."),
      ).toBeInTheDocument(),
    );
  });

  it("renders percentage discount correctly", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("renders fixed discount correctly", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    expect(screen.getByText("$ 50")).toBeInTheDocument();
  });

  it("shows 'All products' for unrestricted coupons", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    // SAVE10 has no product restrictions
    const rows = screen.getAllByText("All products");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows product count for restricted coupons", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    expect(screen.getByText("1 product")).toBeInTheDocument();
  });

  it("shows uses with max limit", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    expect(screen.getByText("42 / 100")).toBeInTheDocument();
  });

  it("shows uses without limit", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    // Multiple coupons have usedCount:0 with no maxUses limit
    const zeroCells = screen.getAllByText("0");
    expect(zeroCells.length).toBeGreaterThan(0);
  });

  it("shows 'active' badge for active non-expired coupon", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    // SAVE10 is active with no expiry
    const badges = screen.getAllByText("active");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows 'expired' badge for expired coupon", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    expect(screen.getByText("expired")).toBeInTheDocument();
  });

  it("shows 'inactive' badge for disabled coupon", async () => {
    renderCoupons();
    await waitFor(() =>
      expect(screen.getByText("DISABLED")).toBeInTheDocument(),
    );
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });

  it("opens Create Coupon modal on button click", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );
  });

  it("calls api.post with uppercased code when creating a coupon", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );

    await userEvent.type(screen.getByPlaceholderText("SUMMER10"), "promo20");
    await userEvent.clear(screen.getByPlaceholderText("10"));
    await userEvent.type(screen.getByPlaceholderText("10"), "20");

    // [0] is the page header button, [1] is the modal submit button
    fireEvent.click(
      screen.getAllByText("Create Coupon", { selector: "button" })[1],
    );
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/coupons",
        expect.objectContaining({ code: "PROMO20", value: 20 }),
      ),
    );
  });

  it("shows validation error when percentage > 100", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );

    await userEvent.type(screen.getByPlaceholderText("SUMMER10"), "BIGDEAL");
    await userEvent.clear(screen.getByPlaceholderText("10"));
    await userEvent.type(screen.getByPlaceholderText("10"), "150");

    fireEvent.click(
      screen.getAllByText("Create Coupon", { selector: "button" })[1],
    );
    await waitFor(() =>
      expect(
        screen.getByText("Percentage discount cannot exceed 100"),
      ).toBeInTheDocument(),
    );
    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it("shows server error when create fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Code already exists"));
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );

    await userEvent.type(screen.getByPlaceholderText("SUMMER10"), "SAVE10");
    await userEvent.clear(screen.getByPlaceholderText("10"));
    await userEvent.type(screen.getByPlaceholderText("10"), "10");

    fireEvent.click(
      screen.getAllByText("Create Coupon", { selector: "button" })[1],
    );
    await waitFor(() =>
      expect(screen.getByText("Code already exists")).toBeInTheDocument(),
    );
  });

  it("opens Edit modal prefilled with coupon data", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() =>
      expect(screen.getByText("Edit Coupon")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("SAVE10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("prefills product chips when editing a restricted coupon", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    // FLAT50 is the second row — click its Edit
    fireEvent.click(screen.getAllByText("Edit")[1]);
    await waitFor(() =>
      expect(screen.getByText("Edit Coupon")).toBeInTheDocument(),
    );
    expect(screen.getByText("Asahi Beer")).toBeInTheDocument();
  });

  it("calls api.put when saving edits", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() =>
      expect(screen.getByText("Edit Coupon")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/coupons/c1",
        expect.objectContaining({ code: "SAVE10" }),
      ),
    );
  });

  it("opens delete modal with coupon code", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() =>
      expect(screen.getByText("Delete Coupon")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("SAVE10", { selector: "strong" }),
    ).toBeInTheDocument();
  });

  it("calls api.delete when confirming deletion", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() =>
      expect(screen.getByText("Delete Coupon")).toBeInTheDocument(),
    );
    // The modal's confirm delete button
    const buttons = screen.getAllByRole("button", { name: /delete/i });
    const confirmBtn = buttons.at(-1);
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/coupons/c1"),
    );
  });

  it("closes modal on Cancel", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("SUMMER10")).not.toBeInTheDocument(),
    );
  });

  it("searches for products and adds a chip when selected", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create Coupon"));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("SUMMER10")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("radio", { name: /specific products/i }));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Search products to restrict…"),
      ).toBeInTheDocument(),
    );

    await userEvent.type(
      screen.getByPlaceholderText("Search products to restrict…"),
      "Asahi",
    );

    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Asahi Beer"));

    await waitFor(() => {
      // product chip should now appear
      const chips = screen.getAllByText("Asahi Beer");
      expect(chips.length).toBeGreaterThan(0);
    });
  });

  it("removes a product chip when X is clicked", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    // Open edit for FLAT50 which already has Asahi Beer restriction
    fireEvent.click(screen.getAllByText("Edit")[1]);
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );

    // Click the X button on the chip
    const removeBtn = screen
      .getAllByRole("button")
      .find((b) => b.closest("span") !== null);
    expect(removeBtn).toBeDefined();
    fireEvent.click(removeBtn);

    await waitFor(() =>
      expect(screen.queryByText("Asahi Beer")).not.toBeInTheDocument(),
    );
  });
});

describe("Featured coupon", () => {
  it("star buttons are rendered for each coupon row", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    const starBtns = screen.getAllByTitle(/featured/i);
    expect(starBtns).toHaveLength(MOCK_COUPONS.length);
  });

  it("featured coupon has filled-star title 'Featured'", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons/featured") return Promise.resolve(MOCK_FEATURED);
      if (path.startsWith("/products"))
        return Promise.resolve({ products: MOCK_PRODUCTS });
      return Promise.resolve(MOCK_COUPONS);
    });
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    expect(screen.getByTitle("Featured")).toBeInTheDocument();
  });

  it("opens featured modal with displayText input on star click", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle(/featured/i)[0]);
    await waitFor(() =>
      expect(screen.getByText("Featured Coupon Banner")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Banner text *")).toBeInTheDocument();
  });

  it("pre-fills displayText when editing the currently featured coupon", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons/featured") return Promise.resolve(MOCK_FEATURED);
      if (path.startsWith("/products"))
        return Promise.resolve({ products: MOCK_PRODUCTS });
      return Promise.resolve(MOCK_COUPONS);
    });
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    // SAVE10 (c1) is featured — click its star
    fireEvent.click(screen.getAllByTitle(/featured/i)[0]);
    await waitFor(() =>
      expect(
        screen.getByDisplayValue("Use SAVE10 for 10% off!"),
      ).toBeInTheDocument(),
    );
  });

  it("calls api.put to set featured coupon", async () => {
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle(/featured/i)[0]);
    await waitFor(() =>
      expect(screen.getByLabelText("Banner text *")).toBeInTheDocument(),
    );

    await userEvent.type(
      screen.getByLabelText("Banner text *"),
      "Save 10% with SAVE10!",
    );
    fireEvent.click(screen.getByText("Set as Featured"));

    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith("/coupons/c1/feature", {
        displayText: "Save 10% with SAVE10!",
      }),
    );
  });

  it("shows Remove Banner button when the coupon is already featured", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons/featured") return Promise.resolve(MOCK_FEATURED);
      if (path.startsWith("/products"))
        return Promise.resolve({ products: MOCK_PRODUCTS });
      return Promise.resolve(MOCK_COUPONS);
    });
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle(/featured/i)[0]);
    await waitFor(() =>
      expect(screen.getByText("Remove Banner")).toBeInTheDocument(),
    );
  });

  it("calls api.delete when Remove Banner is clicked", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons/featured") return Promise.resolve(MOCK_FEATURED);
      if (path.startsWith("/products"))
        return Promise.resolve({ products: MOCK_PRODUCTS });
      return Promise.resolve(MOCK_COUPONS);
    });
    renderCoupons();
    await waitFor(() => expect(screen.getByText("SAVE10")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle(/featured/i)[0]);
    await waitFor(() =>
      expect(screen.getByText("Remove Banner")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Remove Banner"));
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/coupons/featured"),
    );
  });

  it("does not show Remove Banner for a non-featured coupon", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons/featured") return Promise.resolve(MOCK_FEATURED);
      if (path.startsWith("/products"))
        return Promise.resolve({ products: MOCK_PRODUCTS });
      return Promise.resolve(MOCK_COUPONS);
    });
    renderCoupons();
    await waitFor(() => expect(screen.getByText("FLAT50")).toBeInTheDocument());
    // FLAT50 (c2) is NOT featured — click its star (index 1)
    fireEvent.click(screen.getAllByTitle(/featured/i)[1]);
    await waitFor(() =>
      expect(screen.getByText("Featured Coupon Banner")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Remove Banner")).not.toBeInTheDocument();
  });
});
