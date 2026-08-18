import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Stores from "./Stores";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_STORES = [
  {
    id: "s1",
    name: "SipNow Wollert",
    line1: "1 Main St",
    line2: null,
    city: "Wollert",
    county: "VIC",
    postcode: "3750",
    country: "AU",
    phone: "0400000000",
    hours: "Mon-Fri 9am-6pm",
    lat: -37.6,
    lng: 145.0,
    rendrStoreId: "sipnow-wollert",
    isActive: true,
  },
  {
    id: "s2",
    name: "SipNow Closed Store",
    line1: "2 Old St",
    line2: null,
    city: "Melbourne",
    county: "VIC",
    postcode: "3000",
    country: "AU",
    phone: null,
    hours: null,
    lat: null,
    lng: null,
    rendrStoreId: null,
    isActive: false,
  },
];

function renderStores() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Stores />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Stores page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(MOCK_STORES);
  });

  it("lists stores with name, address, and active status", async () => {
    renderStores();
    expect(await screen.findByText("SipNow Wollert")).toBeInTheDocument();
    expect(screen.getByText("SipNow Closed Store")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("requests the full list including inactive stores", async () => {
    renderStores();
    await screen.findByText("SipNow Wollert");
    expect(api.get).toHaveBeenCalledWith("/stores?activeOnly=false");
  });

  it("shows an empty state when there are no stores", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderStores();
    expect(await screen.findByText(/No stores yet/i)).toBeInTheDocument();
  });

  it("creates a new store", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "s3" });
    renderStores();
    await screen.findByText("SipNow Wollert");

    await userEvent.click(screen.getByRole("button", { name: /add store/i }));
    fireEvent.change(screen.getByPlaceholderText("SipNow Wollert"), {
      target: { value: "SipNow Epping" },
    });
    fireEvent.change(screen.getByPlaceholderText("1 Main Street"), {
      target: { value: "5 High St" },
    });
    fireEvent.change(screen.getByPlaceholderText("Wollert"), {
      target: { value: "Epping" },
    });
    fireEvent.change(screen.getByPlaceholderText("VIC"), {
      target: { value: "VIC" },
    });
    fireEvent.change(screen.getByPlaceholderText("3750"), {
      target: { value: "3076" },
    });

    await userEvent.click(
      screen.getAllByRole("button", { name: /add store/i })[1],
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/stores",
        expect.objectContaining({
          name: "SipNow Epping",
          line1: "5 High St",
          city: "Epping",
          county: "VIC",
          postcode: "3076",
        }),
      ),
    );
  });

  it("shows a validation error when required fields are missing", async () => {
    renderStores();
    await screen.findByText("SipNow Wollert");
    await userEvent.click(screen.getByRole("button", { name: /add store/i }));
    await userEvent.click(
      screen.getAllByRole("button", { name: /add store/i })[1],
    );
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("deletes a store after confirmation", async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);
    renderStores();
    await screen.findByText("SipNow Wollert");

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    const confirmButtons = screen.getAllByRole("button", {
      name: /^delete$/i,
    });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/stores/s1"));
  });
});
