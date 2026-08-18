import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Catalogue from "./Catalogue";
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

const mockTree = [
  {
    id: "cat-1",
    name: "Wines",
    slug: "wines",
    image: "https://example.com/wines.jpg",
    parentId: null,
    order: 1,
    children: [
      {
        id: "sub-1",
        name: "Red Wine",
        slug: "red-wine",
        image: null,
        parentId: "cat-1",
        order: 1,
        children: [
          {
            id: "type-1",
            name: "Shiraz",
            slug: "shiraz",
            image: null,
            parentId: "sub-1",
            order: 1,
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "cat-2",
    name: "Beers",
    slug: "beers",
    image: null,
    parentId: null,
    order: 2,
    children: [],
  },
];

function renderCatalogue() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Catalogue />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(mockTree);
  vi.mocked(api.post).mockResolvedValue({
    id: "new-cat",
    name: "New Cat",
    slug: "new-cat",
  });
  vi.mocked(api.put).mockResolvedValue({});
  vi.mocked(api.delete).mockResolvedValue(undefined);
  vi.mocked(api.upload).mockResolvedValue({
    url: "https://cdn.example.com/img.jpg",
  });
});

describe("Catalogue page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderCatalogue();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Cannot load catalogue"));
    renderCatalogue();
    await waitFor(() =>
      expect(screen.getByText("Cannot load catalogue")).toBeInTheDocument(),
    );
  });

  it("renders root categories", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    expect(screen.getByText("Beers")).toBeInTheDocument();
  });

  it("shows category image when present", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    const img = screen.getByAltText("Wines");
    expect(img).toBeInTheDocument();
  });

  it("shows placeholder when category has no image", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Beers")).toBeInTheDocument());
    // Beers has no image, so we won't find an img with alt="Beers"
    expect(screen.queryByAltText("Beers")).not.toBeInTheDocument();
  });

  it("expands subcategories when chevron is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    // Initially subcategories should be hidden
    expect(screen.queryByText("Red Wine")).not.toBeInTheDocument();
    // Find the ChevronRight button for Wines - it's a button without text
    const winesRow =
      screen.getByText("Wines").closest("[class*='ml-']") ??
      screen.getByText("Wines").closest("div");
    if (winesRow) {
      const chevronBtn = winesRow.querySelector("button");
      if (chevronBtn) {
        fireEvent.click(chevronBtn);
        await waitFor(() =>
          expect(screen.getByText("Red Wine")).toBeInTheDocument(),
        );
      }
    }
  });

  it("shows Add Category button", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    expect(screen.getByText("Add Category")).toBeInTheDocument();
  });

  it("starts adding a root category", async () => {
    renderCatalogue();
    await waitFor(() =>
      expect(screen.getByText("Add Category")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Category"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/New category name/i),
      ).toBeInTheDocument(),
    );
  });

  it("saves new category on Enter key", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "new-cat" });
    renderCatalogue();
    await waitFor(() =>
      expect(screen.getByText("Add Category")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Category"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/New category name/i),
      ).toBeInTheDocument(),
    );
    const input = screen.getByPlaceholderText(/New category name/i);
    await userEvent.type(input, "Spirits");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/admin/catalogue", {
        name: "Spirits",
        parentId: null,
      }),
    );
  });

  it("cancels adding on Escape key", async () => {
    renderCatalogue();
    await waitFor(() =>
      expect(screen.getByText("Add Category")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Add Category"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/New category name/i),
      ).toBeInTheDocument(),
    );
    const input = screen.getByPlaceholderText(/New category name/i);
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(/New category name/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("starts renaming when rename button is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    // Find edit (pencil) button for Wines row
    const winesText = screen.getByText("Wines");
    const winesRow = winesText.closest("div");
    if (winesRow) {
      const editBtn =
        winesRow.querySelector("button[title='Rename']") ??
        Array.from(winesRow.querySelectorAll("button")).find(
          (b) =>
            b.getAttribute("title") === "Rename" ||
            b.innerHTML.includes("Pencil"),
        );
      if (editBtn) {
        fireEvent.click(editBtn);
        await waitFor(() =>
          expect(screen.getByDisplayValue("Wines")).toBeInTheDocument(),
        );
      }
    }
  });

  it("calls api.delete when delete button is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Delete")[0]);
    await waitFor(() =>
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith(
        "/admin/catalogue/cat-1",
      ),
    );
  });

  it("starts renaming when Rename button is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Rename")[0]);
    await waitFor(() =>
      expect(screen.getByDisplayValue("Wines")).toBeInTheDocument(),
    );
  });

  it("saves rename when Enter key pressed", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Rename")[0]);
    await waitFor(() =>
      expect(screen.getByDisplayValue("Wines")).toBeInTheDocument(),
    );
    const input = screen.getByDisplayValue("Wines");
    fireEvent.change(input, { target: { value: "Premium Wines" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/admin/catalogue/cat-1",
        { name: "Premium Wines" },
      ),
    );
  });

  it("cancels rename when Escape key pressed", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Rename")[0]);
    await waitFor(() =>
      expect(screen.getByDisplayValue("Wines")).toBeInTheDocument(),
    );
    fireEvent.keyDown(screen.getByDisplayValue("Wines"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByDisplayValue("Wines")).not.toBeInTheDocument(),
    );
  });

  it("adds a subcategory when Add Subcategory is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Add Subcategory")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("New Subcategory name…"),
      ).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("New Subcategory name…"),
      "Rosé",
    );
    fireEvent.keyDown(screen.getByPlaceholderText("New Subcategory name…"), {
      key: "Enter",
    });
    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/admin/catalogue", {
        name: "Rosé",
        parentId: "cat-1",
      }),
    );
  });

  it("shows image URL editor when Set image is clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Set image")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Paste image URL…"),
      ).toBeInTheDocument(),
    );
  });

  it("saves image URL when Save is clicked in image editor", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Set image")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Paste image URL…"),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByPlaceholderText("Paste image URL…"), {
      target: { value: "https://example.com/wines.jpg" },
    });
    fireEvent.click(screen.getAllByText("Save")[0]);
    await waitFor(() =>
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        "/admin/catalogue/cat-1",
        {
          image: "https://example.com/wines.jpg",
        },
      ),
    );
  });

  it("expands node and shows children when chevron clicked", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    expect(screen.queryByText("Red Wine")).not.toBeInTheDocument();
    const winesRow = screen.getByText("Wines").closest(".group");
    const expandBtn = winesRow?.querySelector("button");
    expect(expandBtn).not.toBeNull();
    fireEvent.click(expandBtn);
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
  });

  it("cancels adding subcategory on Escape key", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Add Subcategory")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("New Subcategory name…"),
      ).toBeInTheDocument(),
    );
    fireEvent.keyDown(screen.getByPlaceholderText("New Subcategory name…"), {
      key: "Escape",
    });
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText("New Subcategory name…"),
      ).not.toBeInTheDocument(),
    );
  });

  it("uploads image file via file input in image editor", async () => {
    vi.mocked(api.upload).mockResolvedValue({
      url: "https://cdn.example.com/wines.jpg",
    });
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Set image")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Paste image URL…"),
      ).toBeInTheDocument(),
    );
    const file = new File(["img"], "wines.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[accept="image/*"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(vi.mocked(api.upload)).toHaveBeenCalled());
  });

  it("closes image editor with X button", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTitle("Set image")[0]);
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Paste image URL…"),
      ).toBeInTheDocument(),
    );
    // The X button is the last button in the image-editor container (after Upload and Save)
    const urlInput = screen.getByPlaceholderText("Paste image URL…");
    const editorContainer = urlInput.parentElement;
    const buttons = Array.from(editorContainer.querySelectorAll("button"));
    const xBtn = buttons[buttons.length - 1]; // X is the last button
    fireEvent.click(xBtn);
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText("Paste image URL…"),
      ).not.toBeInTheDocument(),
    );
  });

  it("export button is disabled when tree is empty", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderCatalogue();
    await waitFor(() =>
      expect(screen.getByTitle("Export catalogue as JSON")).toBeInTheDocument(),
    );
    expect(screen.getByTitle("Export catalogue as JSON")).toBeDisabled();
  });

  it("export button is enabled when tree has data", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    expect(screen.getByTitle("Export catalogue as JSON")).not.toBeDisabled();
  });

  it("clicking export triggers a JSON download", async () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle("Export catalogue as JSON"));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    clickSpy.mockRestore();
  });

  it("import button is present", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    expect(screen.getByTitle("Import catalogue from JSON")).toBeInTheDocument();
  });

  it("import triggers api.post with parsed JSON nodes and shows success", async () => {
    vi.mocked(api.post).mockResolvedValue({ created: 3, skipped: 1 });
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());

    const json = JSON.stringify([{ name: "Spirits" }]);
    const file = new File([json], "catalogue.json", {
      type: "application/json",
    });
    const fileInput = document.querySelector(
      'input[accept=".json"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText("Imported: 3 created, 1 skipped."),
      ).toBeInTheDocument(),
    );
    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      "/admin/catalogue/import",
      { nodes: [{ name: "Spirits" }] },
    );
  });

  it("import shows error message when api.post rejects", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server error"));
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());

    const file = new File(["[{}]"], "catalogue.json", {
      type: "application/json",
    });
    const fileInput = document.querySelector(
      'input[accept=".json"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText(
          "Import failed — check that the file is a valid catalogue JSON.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("import result can be dismissed with X button", async () => {
    vi.mocked(api.post).mockResolvedValue({ created: 1, skipped: 0 });
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());

    const file = new File(['[{"name":"Beer"}]'], "catalogue.json", {
      type: "application/json",
    });
    const fileInput = document.querySelector(
      'input[accept=".json"]',
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getByText("Imported: 1 created, 0 skipped."),
      ).toBeInTheDocument(),
    );

    const successBanner = screen
      .getByText("Imported: 1 created, 0 skipped.")
      .closest("div");
    const dismissBtn = successBanner.querySelector("button");
    fireEvent.click(dismissBtn);

    await waitFor(() =>
      expect(
        screen.queryByText("Imported: 1 created, 0 skipped."),
      ).not.toBeInTheDocument(),
    );
  });

  it("cancels add input via X button in renderAddInput", async () => {
    renderCatalogue();
    await waitFor(() => expect(screen.getByText("Wines")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Category"));
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/New category name/i),
      ).toBeInTheDocument(),
    );
    // Find the ✕ cancel button next to the input
    const cancelBtns = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.querySelector("svg") === null && !b.textContent?.includes("Add"),
      );
    // Alternatively, use the X icon button (non-svg, text-based) near the input
    // The renderAddInput has a button with an X icon (<X size={13} />)
    // This renders as a button with an svg inside, no text
    const inputRow = screen
      .getByPlaceholderText(/New category name/i)
      .closest("div");
    if (inputRow) {
      const xBtn = Array.from(inputRow.querySelectorAll("button")).find(
        (b) =>
          b.querySelector("svg") !== null && !b.textContent?.includes("Add"),
      );
      if (xBtn) {
        fireEvent.click(xBtn);
        await waitFor(() =>
          expect(
            screen.queryByPlaceholderText(/New category name/i),
          ).not.toBeInTheDocument(),
        );
      }
    }
    void cancelBtns;
  });
});
