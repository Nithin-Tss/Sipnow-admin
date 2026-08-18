import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ImagePlus } from "lucide-react";
import { api } from "../lib/api";
import { inputCls } from "../lib/ui";
import Modal from "../components/Modal";
import PaginationBar from "../components/PaginationBar";
import DeleteModalActions from "../components/DeleteModalActions";
import EmptyState from "../components/EmptyState";
import FormError from "../components/FormError";
import SearchInput from "../components/SearchInput";
import { useProductsPage } from "../hooks/useProductsPage";

const PROMO_TABS = [
  { value: "IN_STORE_PROMOTION", label: "In-Store Promotion" },
  { value: "CLEARANCE", label: "Clearance Sale" },
  { value: "MEMBER", label: "Member Promotion" },
];

const PER_PAGE = 24;

export default function Promotions() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("IN_STORE_PROMOTION");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [priceInput, setPriceInput] = useState("");
  const [packPriceInput, setPackPriceInput] = useState("");
  const [casePriceInput, setCasePriceInput] = useState("");
  const [formErr, setFormErr] = useState("");

  const { data, isLoading, error } = useProductsPage(
    "promotions",
    page,
    "",
    PER_PAGE,
    undefined,
    null,
    activeTab,
  );
  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const { data: searchData, isFetching: searching } = useProductsPage(
    "promotion-search",
    1,
    search,
    8,
    undefined,
    null,
  );
  const searchResults = search ? (searchData?.products ?? []) : [];

  const assignMutation = useMutation({
    mutationFn: (vars) =>
      api.put(`/products/${vars.id}`, {
        promotionType: activeTab,
        promotionPrice: vars.promotionPrice,
        promotionPackPrice: vars.promotionPackPrice,
        promotionCasePrice: vars.promotionCasePrice,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setModal(null);
      setAssigning(null);
      setPriceInput("");
      setPackPriceInput("");
      setCasePriceInput("");
    },
    onError: (err) => setFormErr(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id) =>
      api.put(`/products/${id}`, {
        promotionType: "NONE",
        promotionPrice: null,
        promotionPackPrice: null,
        promotionCasePrice: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setModal(null);
      setAssigning(null);
    },
    onError: (err) => setFormErr(err.message),
  });

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  function openAdd() {
    setSearch("");
    setFormErr("");
    setModal("add");
  }

  function pickForAssign(p) {
    setAssigning(p);
    setPriceInput(p.promotionPrice != null ? String(p.promotionPrice) : "");
    setPackPriceInput(
      p.promotionPackPrice != null ? String(p.promotionPackPrice) : "",
    );
    setCasePriceInput(
      p.promotionCasePrice != null ? String(p.promotionCasePrice) : "",
    );
    setFormErr("");
    setModal("assign");
  }

  function openRemove(p) {
    setAssigning(p);
    setFormErr("");
    setModal("remove");
  }

  function saveAssign() {
    if (!assigning) return;
    // Products sold as a pack never sell loose individual units (same rule
    // the storefront and cart controller use — see `hasPack`/`packPrice`
    // checks in AddToCartButton.tsx and cart.controller.ts), so a unit-level
    // promotion price is meaningless and must not be saved for them.
    const noIndividualSale = assigning.packPrice != null;
    if (
      (noIndividualSale || priceInput.trim() === "") &&
      packPriceInput.trim() === "" &&
      casePriceInput.trim() === ""
    ) {
      setFormErr(
        "Enter at least one promotion price (pack or case) — a promotion with no price won't show a discount on the storefront.",
      );
      return;
    }
    setFormErr("");
    assignMutation.mutate({
      id: assigning.id,
      promotionPrice:
        noIndividualSale || priceInput.trim() === ""
          ? null
          : Number.parseFloat(priceInput),
      promotionPackPrice:
        packPriceInput.trim() === "" ? null : Number.parseFloat(packPriceInput),
      promotionCasePrice:
        casePriceInput.trim() === "" ? null : Number.parseFloat(casePriceInput),
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Promotions</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
        >
          <Plus size={13} /> Add Product
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
        {PROMO_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => switchTab(tab.value)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error.message}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState message="No products in this promotion yet. Add one to get started." />
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border border-gray-100 p-3"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-14 h-14 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 flex items-center justify-center shrink-0">
                    <ImagePlus size={18} className="text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ${p.originalPrice.toFixed(2)}
                    {p.promotionPrice != null && (
                      <span className="text-primary font-semibold">
                        {" "}
                        → ${p.promotionPrice.toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => pickForAssign(p)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary px-2 py-1 hover:bg-primary/5"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => openRemove(p)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            perPage={PER_PAGE}
          />
        </div>
      )}

      {/* Add product: search + pick */}
      {modal === "add" && (
        <Modal
          title={`Add product to ${PROMO_TABS.find((t) => t.value === activeTab)?.label}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <SearchInput
              autoFocus
              value={search}
              onChange={setSearch}
              placeholder="Search by name or SKU…"
            />

            {searching && <p className="text-xs text-gray-400">Searching…</p>}

            {search && !searching && searchResults.length === 0 && (
              <p className="text-xs text-gray-400">No products found.</p>
            )}

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickForAssign(p)}
                  className="w-full flex items-center gap-3 text-left border border-gray-100 p-2 hover:border-primary/40 hover:bg-primary/5"
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center shrink-0">
                      <ImagePlus size={14} className="text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                  </div>
                  {p.promotionType !== "NONE" && (
                    <span className="shrink-0 border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                      already in{" "}
                      {p.promotionType.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Assign / edit promotion price */}
      {modal === "assign" && assigning && (
        <Modal
          title={`${PROMO_TABS.find((t) => t.value === activeTab)?.label} price`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <FormError message={formErr} />
            <div className="flex items-center gap-3">
              {assigning.imageUrl ? (
                <img
                  src={assigning.imageUrl}
                  alt={assigning.name}
                  className="w-12 h-12 object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center shrink-0">
                  <ImagePlus size={16} className="text-gray-300" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {assigning.name}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {assigning.sku} · Original $
                  {assigning.originalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {assigning.packPrice == null && (
              <div>
                <label
                  htmlFor="promoPrice"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Promotion Price{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="promoPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 18.99"
                  className={inputCls}
                />
              </div>
            )}
            {assigning.packPrice != null && (
              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-2">
                This product is only sold as a pack/case — set the pack and/or
                case promotion price below instead of a unit price.
              </p>
            )}

            {assigning.packOf != null && (
              <div>
                <label
                  htmlFor="promoPackPrice"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Promotion Pack Price{" "}
                  <span className="text-gray-400 font-normal">
                    (pack of {assigning.packOf}
                    {assigning.packPrice != null
                      ? ` · normally $${assigning.packPrice.toFixed(2)}`
                      : ""}
                    )
                  </span>
                </label>
                <input
                  id="promoPackPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={packPriceInput}
                  onChange={(e) => setPackPriceInput(e.target.value)}
                  placeholder="e.g. 99.99"
                  className={inputCls}
                />
              </div>
            )}

            {assigning.caseOf != null && (
              <div>
                <label
                  htmlFor="promoCasePrice"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Promotion Case Price{" "}
                  <span className="text-gray-400 font-normal">
                    (case of {assigning.caseOf}
                    {assigning.casePrice != null
                      ? ` · normally $${assigning.casePrice.toFixed(2)}`
                      : ""}
                    )
                  </span>
                </label>
                <input
                  id="promoCasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={casePriceInput}
                  onChange={(e) => setCasePriceInput(e.target.value)}
                  placeholder="e.g. 449.99"
                  className={inputCls}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModal(null)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAssign}
                disabled={assignMutation.isPending}
                className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
              >
                {assignMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove from promotion */}
      {modal === "remove" && assigning && (
        <Modal title="Remove from promotion" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600">
            Remove <strong className="text-gray-900">"{assigning.name}"</strong>{" "}
            from{" "}
            {PROMO_TABS.find((t) => t.value === activeTab)?.label.toLowerCase()}
            ?
          </p>
          <DeleteModalActions
            formErr={formErr}
            isPending={removeMutation.isPending}
            onCancel={() => setModal(null)}
            onDelete={() => removeMutation.mutate(assigning.id)}
          />
        </Modal>
      )}
    </div>
  );
}
