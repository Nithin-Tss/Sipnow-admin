import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Offers from "./Offers";
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
}));

vi.mock("../lib/imageValidation", () => ({
  validateImage: vi.fn().mockResolvedValue(null),
  PRODUCT_IMAGE: { maxWidth: 800, maxHeight: 800 },
  OFFER_BANNER: { maxWidth: 1200, maxHeight: 300 },
}));

const mockCoupons = [
  { id: "c1", code: "SUMMER10", type: "PERCENTAGE", value: 10 },
  { id: "c2", code: "FLAT50", type: "FIXED", value: 50 },
];

const mockPromotions = [
  {
    id: "promo-1",
    title: "Summer Sale",
    imageUrl: "https://example.com/summer.jpg",
    couponId: "c1",
    coupon: mockCoupons[0],
    active: true,
  },
  {
    id: "promo-2",
    title: "Winter Deals",
    imageUrl: "",
    couponId: "c2",
    coupon: mockCoupons[1],
    active: false,
  },
];

function renderOffers() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Offers />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((path) => {
    if (path === "/coupons") return Promise.resolve(mockCoupons);
    return Promise.resolve(mockPromotions);
  });
  vi.mocked(api.post).mockResolvedValue({ id: "new-promo" });
  vi.mocked(api.put).mockResolvedValue({});
  vi.mocked(api.delete).mockResolvedValue(undefined);
  vi.mocked(api.upload).mockResolvedValue({
    url: "https://cdn.example.com/img.jpg",
  });
});

describe("Offers page (General Promotions)", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderOffers();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons") return Promise.resolve(mockCoupons);
      return Promise.reject(new Error("Failed to load promotions"));
    });
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Failed to load promotions")).toBeInTheDocument(),
    );
  });

  it("renders general promotions list", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    expect(screen.getByText("Winter Deals")).toBeInTheDocument();
  });

  it("shows empty state when no promotions", async () => {
    vi.mocked(api.get).mockImplementation((path) => {
      if (path === "/coupons") return Promise.resolve(mockCoupons);
      return Promise.resolve([]);
    });
    renderOffers();
    await waitFor(() =>
      expect(
        screen.getByText("No general promotions yet. Add one to get started."),
      ).toBeInTheDocument(),
    );
  });

  it("shows Active/Hidden badges", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("shows the linked coupon code and discount", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    expect(screen.getByText("SUMMER10 · 10% off")).toBeInTheDocument();
  });

  it("shows image when imageUrl is present", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    const img = screen.getByAltText("Summer Sale");
    expect(img).toBeInTheDocument();
  });

  it("shows placeholder when no imageUrl", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Winter Deals")).toBeInTheDocument(),
    );
    expect(screen.queryByAltText("Winter Deals")).not.toBeInTheDocument();
  });

  it("opens Add Promotion modal", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Summer Sale"),
      ).toBeInTheDocument(),
    );
  });

  it("lists coupons in the coupon picker", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(screen.getByLabelText("Coupon *")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("option", { name: "SUMMER10 — 10% off" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "FLAT50 — $ 50 off" }),
    ).toBeInTheDocument();
  });

  it("opens Edit Promotion modal", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() =>
      expect(screen.getByText("Edit General Promotion")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("Summer Sale")).toBeInTheDocument();
  });

  it("populates edit form with the linked coupon selected", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() =>
      expect(screen.getByText("Edit General Promotion")).toBeInTheDocument(),
    );
    const select = screen.getByLabelText("Coupon *");
    expect(select.value).toBe("c1");
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("calls api.post when saving new promotion", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Summer Sale"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. Summer Sale"),
      "New Promo",
    );
    await userEvent.selectOptions(screen.getByLabelText("Coupon *"), "c1");
    fireEvent.click(screen.getByText("Save Promotion"));
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        "/offers",
        expect.objectContaining({ title: "New Promo", couponId: "c1" }),
      ),
    );
  });

  it("shows validation error when no coupon selected", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Summer Sale"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. Summer Sale"),
      "New Promo",
    );
    fireEvent.click(screen.getByText("Save Promotion"));
    await waitFor(() =>
      expect(
        screen.getByText("Select a coupon for this promotion"),
      ).toBeInTheDocument(),
    );
    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it("calls api.put when saving edited promotion", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() =>
      expect(screen.getByText("Edit General Promotion")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Save Promotion"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/offers/promo-1",
        expect.any(Object),
      ),
    );
  });

  it("shows error message when save fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Save failed"));
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("e.g. Summer Sale"),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText("Coupon *"), "c1");
    fireEvent.click(screen.getByText("Save Promotion"));
    await waitFor(() =>
      expect(screen.getByText("Save failed")).toBeInTheDocument(),
    );
  });

  it("cancels add modal on Cancel click", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() => expect(screen.getByText("Cancel")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText("e.g. Summer Sale"),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens Delete Promotion modal", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() =>
      expect(screen.getByText("Delete General Promotion")).toBeInTheDocument(),
    );
    expect(screen.getByText(/"Summer Sale"/)).toBeInTheDocument();
  });

  it("calls api.delete when confirming deletion", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() =>
      expect(screen.getByText("Delete General Promotion")).toBeInTheDocument(),
    );
    // Click the confirm delete button in modal
    const confirmBtn = screen
      .getAllByText("Delete")
      .find((el) => el.closest("button") && el.textContent === "Delete");
    if (confirmBtn?.closest("button")) {
      fireEvent.click(confirmBtn.closest("button"));
      await waitFor(() =>
        expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/offers/promo-1"),
      );
    }
  });

  it("calls toggle mutation when Hide/Show is clicked", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Hide"));
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/offers/promo-1",
        expect.objectContaining({ active: false }),
      ),
    );
  });

  it("shows Show button for inactive promotion", async () => {
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Winter Deals")).toBeInTheDocument(),
    );
    expect(screen.getByText("Show")).toBeInTheDocument();
  });

  it("uploads image and sets imageUrl", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      url: "https://cdn.example.com/new.jpg",
    });
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(screen.getByText("Upload Image")).toBeInTheDocument(),
    );

    const file = new File(["content"], "banner.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      "input[type='file']",
    );
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalled());
    }
  });

  it("shows validation error when image fails", async () => {
    vi.mocked(imageValidation.validateImage).mockResolvedValue(
      "Image dimensions invalid",
    );
    renderOffers();
    await waitFor(() =>
      expect(screen.getByText("Summer Sale")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Promotion"));
    await waitFor(() =>
      expect(screen.getByText("Upload Image")).toBeInTheDocument(),
    );

    const file = new File(["content"], "banner.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      "input[type='file']",
    );
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() =>
        expect(
          screen.getByText("Image dimensions invalid"),
        ).toBeInTheDocument(),
      );
    }
  });
});
