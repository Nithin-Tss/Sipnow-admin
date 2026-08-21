import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/helpers";

const apiFetch = vi.fn();
vi.mock("../lib/apiClient", () => ({
  apiFetch: (...args) => apiFetch(...args),
  getToken: () => "t",
  setToken: () => {},
}));

const PRODUCTS = [
  { _id: "p1", name: "Coopers Pale Ale", sku: "CPA", price: 20, verified: true },
  { _id: "p2", name: "Absolut Vodka", sku: "AV", price: 50, verified: true },
];

const Offers = (await import("./Offers")).default;

function routeFor(path) {
  if (path.startsWith("/products")) return { items: PRODUCTS };
  if (path.startsWith("/offers")) return { offers: [] };
  return {};
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (path) => routeFor(path));
});

describe("Admin General Promotions — save", () => {
  it("sends the selected product ids as applicableProducts", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Offers />);

    await user.click(await screen.findByRole("button", { name: /Add Offer/i }));

    // Product picker is populated from the live product list.
    const p1 = await screen.findByRole("checkbox", {
      name: /Coopers Pale Ale/i,
    });
    const p2 = screen.getByRole("checkbox", { name: /Absolut Vodka/i });

    await user.type(screen.getByPlaceholderText("Offer title"), "Summer Sale");
    await user.type(screen.getByPlaceholderText("Discount value"), "15");
    await user.click(p1);
    await user.click(p2);

    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      const post = apiFetch.mock.calls.find(
        ([, opts]) => opts?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = JSON.parse(post[1].body);
      expect(body.title).toBe("Summer Sale");
      expect(body.applicableProducts).toEqual(["p1", "p2"]);
    });
  });

  it("pre-selects already-attached products when editing", async () => {
    apiFetch.mockImplementation(async (path) => {
      if (path.startsWith("/products")) return { items: PRODUCTS };
      if (path.startsWith("/offers"))
        return {
          offers: [
            {
              _id: "o1",
              title: "Existing",
              discountType: "percentage",
              discountValue: 10,
              isActive: true,
              // API returns these populated, not as raw ids.
              applicableProducts: [{ _id: "p2", name: "Absolut Vodka" }],
            },
          ],
        };
      return {};
    });

    const user = userEvent.setup();
    renderWithProviders(<Offers />);

    const editButtons = await screen.findAllByRole("button", { name: "" });
    await user.click(editButtons.find((b) => b.querySelector("svg")));

    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /Absolut Vodka/i }),
      ).toBeChecked();
    });
    expect(
      screen.getByRole("checkbox", { name: /Coopers Pale Ale/i }),
    ).not.toBeChecked();
  });

  it("only offers verified products in the picker", async () => {
    apiFetch.mockImplementation(async (path) => {
      if (path.startsWith("/products"))
        return {
          items: [
            ...PRODUCTS,
            { _id: "p3", name: "Unverified Wine", sku: "UW", price: 12 },
          ],
        };
      if (path.startsWith("/offers")) return { offers: [] };
      return {};
    });

    const user = userEvent.setup();
    renderWithProviders(<Offers />);

    await user.click(await screen.findByRole("button", { name: /Add Offer/i }));

    await screen.findByRole("checkbox", { name: /Coopers Pale Ale/i });
    expect(
      screen.queryByRole("checkbox", { name: /Unverified Wine/i }),
    ).not.toBeInTheDocument();
  });
});
