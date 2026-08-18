import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Compare from "./Compare";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_COMPETITOR = {
  id: "comp1",
  name: "Dan Murphy's",
  slug: "dan-murphys",
  baseUrl: "https://www.danmurphys.com.au",
};

const MOCK_SUMMARY = {
  competitors: [MOCK_COMPETITOR],
  rows: [
    {
      productId: "p1",
      productSku: "SKU-001",
      productName: "Asahi Beer",
      productBrand: null,
      productVolumeMl: 330,
      stock: 24,
      ourPrice: 55,
      caseOf: null,
      casePrice: null,
      categoryIds: ["cat1"],
      prices: [
        {
          linkId: "link1",
          competitorId: "comp1",
          competitorName: "Dan Murphy's",
          competitorSlug: "dan-murphys",
          url: "https://www.danmurphys.com.au/product/asahi",
          price: 50,
          lastFetchedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      cheapestCompetitorPrice: 50,
      delta: 5, // ourPrice(55) - cheapest(50) — they're cheaper
    },
    {
      productId: "p2",
      productSku: "SKU-002",
      productName: "Red Wine",
      productBrand: null,
      productVolumeMl: null,
      stock: 10,
      ourPrice: 30,
      caseOf: null,
      casePrice: null,
      categoryIds: ["cat2"],
      prices: [
        {
          linkId: "link2",
          competitorId: "comp1",
          competitorName: "Dan Murphy's",
          competitorSlug: "dan-murphys",
          url: "https://www.danmurphys.com.au/product/shiraz",
          price: 35,
          lastFetchedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      cheapestCompetitorPrice: 35,
      delta: -5, // ourPrice(30) - cheapest(35) — we're cheaper
    },
    {
      productId: "p3",
      productSku: "SKU-003",
      productName: "Craft Beer",
      productBrand: null,
      productVolumeMl: null,
      stock: 5,
      ourPrice: 20,
      caseOf: null,
      casePrice: null,
      categoryIds: [],
      prices: [],
      cheapestCompetitorPrice: null,
      delta: null,
    },
  ],
};

function renderCompare() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Compare />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((path) => {
    if (path === "/competitors/summary") return Promise.resolve(MOCK_SUMMARY);
    return Promise.resolve({});
  });
  vi.mocked(api.post).mockResolvedValue({ total: 3, done: 3, errors: [] });
  vi.mocked(api.patch).mockResolvedValue({});
  vi.mocked(api.put).mockResolvedValue({});
});

describe("Compare page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderCompare();
    expect(screen.getByText("Loading comparison data…")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Server error"));
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText(/Server error/)).toBeInTheDocument(),
    );
  });

  it("renders all product names in the table", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    // Switch to All Products tab to see all rows (including those without competitor links)
    fireEvent.click(screen.getByRole("button", { name: /All Products/ }));
    await waitFor(() =>
      expect(screen.getByText("Craft Beer")).toBeInTheDocument(),
    );
    expect(screen.getByText("Red Wine")).toBeInTheDocument();
  });

  it("renders competitor tab", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    // The tab button text is "Dan Murphy's (2)" — there may also be a Fetch All button
    const danButtons = screen.getAllByRole("button", { name: /Dan Murphy's/ });
    expect(danButtons.length).toBeGreaterThan(0);
  });

  it("renders our price in $X.XX format", async () => {
    renderCompare();
    await waitFor(() => expect(screen.getByText("$55.00")).toBeInTheDocument());
  });

  it("renders competitor price in $X.XX format", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("renders +$5.00 delta when they are cheaper (positive delta)", async () => {
    renderCompare();
    // Already on Dan Murphy's tab by default (activeTab=0)
    await waitFor(() => expect(screen.getByText("+$5.00")).toBeInTheDocument());
  });

  it("renders -$5.00 delta when we are cheaper (negative delta)", async () => {
    renderCompare();
    // Already on Dan Murphy's tab by default (activeTab=0)
    await waitFor(() => expect(screen.getByText("-$5.00")).toBeInTheDocument());
  });

  it("shows filter chips with correct counts", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    // On Dan Murphy's tab: 2 linked products
    expect(
      screen.getByRole("button", { name: /All \(2\)/ }),
    ).toBeInTheDocument();
  });

  it("filtering to we're cheaper shows only Red Wine", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /We're cheaper/ }));
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Asahi Beer")).not.toBeInTheDocument();
    expect(screen.queryByText("Craft Beer")).not.toBeInTheDocument();
  });

  it("filtering to they're cheaper shows only Asahi Beer", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /They're cheaper/ }));
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Red Wine")).not.toBeInTheDocument();
    expect(screen.queryByText("Craft Beer")).not.toBeInTheDocument();
  });

  it("shows empty state message when no rows match filter", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/competitors/summary")
        return Promise.resolve({
          competitors: [MOCK_COMPETITOR],
          rows: [MOCK_SUMMARY.rows[0]], // only one row, no unmatched
        });
      return Promise.resolve({});
    });
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /No price/ }));
    await waitFor(() =>
      expect(
        screen.getByText("No products match the current filter."),
      ).toBeInTheDocument(),
    );
  });

  it("shows empty state when no products exist", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/competitors/summary")
        return Promise.resolve({ competitors: [MOCK_COMPETITOR], rows: [] });
      return Promise.resolve({});
    });
    renderCompare();
    await waitFor(() =>
      expect(
        screen.getByText("No products match the current filter."),
      ).toBeInTheDocument(),
    );
  });

  it("opens detail panel when a row is clicked", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Asahi Beer"));
    await waitFor(() =>
      expect(screen.getByText("Our price")).toBeInTheDocument(),
    );
  });

  it("closes detail panel when backdrop is clicked", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Asahi Beer"));
    await waitFor(() =>
      expect(screen.getByText("Our price")).toBeInTheDocument(),
    );
    const backdrop = document.querySelector(".fixed.inset-0.z-20");
    if (backdrop) fireEvent.click(backdrop);
    await waitFor(() =>
      expect(screen.queryByText("Our price")).not.toBeInTheDocument(),
    );
  });

  it("opens edit link modal from detail panel", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Asahi Beer"));
    await waitFor(() =>
      expect(screen.getByTitle("Edit URL")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit URL"));
    await waitFor(() =>
      expect(screen.getByText(/Edit Dan Murphy's Link/)).toBeInTheDocument(),
    );
  });

  it("closes edit link modal on Cancel without calling api.put", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Asahi Beer"));
    await waitFor(() =>
      expect(screen.getByTitle("Edit URL")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Edit URL"));
    await waitFor(() =>
      expect(screen.getByText(/Edit Dan Murphy's Link/)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    await waitFor(() =>
      expect(
        screen.queryByText(/Edit Dan Murphy's Link/),
      ).not.toBeInTheDocument(),
    );
    expect(vi.mocked(api.put)).not.toHaveBeenCalled();
  });

  it("Fetch All button calls api.patch per link when local scraper responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ price: 45.99, name: "Asahi 330ml" }),
      }),
    );

    renderCompare();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Fetch All Dan Murphy's Prices/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Fetch All Dan Murphy's Prices/ }),
    );

    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        "/competitors/links/link1/price",
        { price: 45.99, name: "Asahi 330ml" },
      ),
    );
    expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
      "/competitors/links/link2/price",
      { price: 45.99, name: "Asahi 330ml" },
    );

    vi.unstubAllGlobals();
  });

  it("Fetch All button shows scraper banner when local scraper is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused")),
    );

    renderCompare();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Fetch All Dan Murphy's Prices/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Fetch All Dan Murphy's Prices/ }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Local scraper is not running"),
      ).toBeInTheDocument(),
    );

    vi.unstubAllGlobals();
  });

  it("calls /competitors/summary endpoint on mount", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/competitors/summary");
  });

  it("shows Add Competitor (+) button in the tab bar", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    expect(screen.getByTitle("Add competitor")).toBeInTheDocument();
  });

  it("opens Add Competitor modal when + button clicked", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Add competitor"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add Competitor" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Name \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Slug \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Base URL \*/)).toBeInTheDocument();
  });

  it("auto-generates slug from name in Add Competitor modal", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Add competitor"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Name \*/)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Name \*/), {
      target: { value: "BWS Liquor" },
    });
    expect(screen.getByDisplayValue("bws-liquor")).toBeInTheDocument();
  });

  it("Save button is disabled when fields are empty in Add Competitor modal", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Add competitor"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add Competitor" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Add Competitor" }),
    ).toBeDisabled();
  });

  it("calls api.post when Add Competitor form is submitted", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle("Add competitor"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Name \*/)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Name \*/), {
      target: { value: "BWS" },
    });
    fireEvent.change(screen.getByLabelText(/Slug \*/), {
      target: { value: "bws" },
    });
    fireEvent.change(screen.getByLabelText(/Base URL \*/), {
      target: { value: "https://www.bws.com.au" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Competitor" }));
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/competitors", {
        name: "BWS",
        slug: "bws",
        baseUrl: "https://www.bws.com.au",
      }),
    );
  });

  it("shows delete button on hover of a competitor tab", async () => {
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    expect(
      screen.getByTitle(`Delete ${MOCK_COMPETITOR.name}`),
    ).toBeInTheDocument();
  });

  it("calls api.delete with confirm when delete button clicked", async () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue(undefined);
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle(`Delete ${MOCK_COMPETITOR.name}`));
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/competitors/comp1"),
    );
    confirmSpy.mockRestore();
  });

  it("does not call api.delete when confirm is cancelled", async () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    vi.mocked(api.delete).mockResolvedValue(undefined);
    renderCompare();
    await waitFor(() =>
      expect(screen.getByText("Asahi Beer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTitle(`Delete ${MOCK_COMPETITOR.name}`));
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
