"use client";
import { useState, useMemo, memo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  X,
  Edit2,
  Plus,
  Link2,
  Link2Off,
  AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api";
import Modal from "../components/Modal";
import PaginationBar from "../components/PaginationBar";
import SearchInput from "../components/SearchInput";

const PAGE_SIZE = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n) {
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDeltaClass(delta) {
  if (delta === null) return "text-gray-300";
  if (delta < 0) return "text-green-600 font-semibold";
  if (delta > 0) return "text-red-600 font-semibold";
  return "text-gray-400";
}

function getDeltaLabel(delta) {
  if (delta === null) return "—";
  if (delta === 0) return "—";
  const abs = `$${Math.abs(delta).toFixed(2)}`;
  return delta < 0 ? `-${abs}` : `+${abs}`;
}

function productLabel(row) {
  const parts = [];
  if (row.productBrand) parts.push(row.productBrand);
  parts.push(row.productName);
  return parts.join(" ");
}

// ── Edit/Add Link Modal ───────────────────────────────────────────────────────

function EditLinkModal({ row, competitor, onClose, onSaved }) {
  const existing = row.prices.find((p) => p.competitorId === competitor.id);
  const [url, setUrl] = useState(existing?.url ?? "");

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(`/competitors/products/${row.productId}/links`, {
        competitorId: competitor.id,
        url,
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/competitors/links/${existing.linkId}`, { url }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const mutation = existing ? updateMutation : createMutation;

  return (
    <Modal
      title={`${existing ? "Edit" : "Add"} ${competitor.name} Link`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !url.trim()}
            className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Product: <strong>{productLabel(row)}</strong>
        </p>
        <div>
          <label
            htmlFor="edit-url"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            {competitor.name} Product URL
          </label>
          <input
            id="edit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`https://www.${competitor.slug}.com.au/…`}
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-400 mt-1">
            Paste the direct product page URL. Price will be fetched from this
            page.
          </p>
        </div>
        {mutation.error && (
          <p className="text-sm text-red-500">{mutation.error.message}</p>
        )}
      </div>
    </Modal>
  );
}

// ── Local scraper ─────────────────────────────────────────────────────────────

const LOCAL_SCRAPER =
  import.meta.env.VITE_SCRAPER_URL ?? "http://localhost:7777";

async function tryLocalScraper(competitorUrl, competitorSlug) {
  try {
    const res = await fetch(`${LOCAL_SCRAPER}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: competitorUrl, slug: competitorSlug }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Fetch button (per link) ───────────────────────────────────────────────────

function FetchLinkButton({
  linkId,
  competitorUrl,
  competitorSlug,
  onDone,
  onScraperDown,
}) {
  const mutation = useMutation({
    mutationFn: async () => {
      if (!competitorUrl) throw new Error("No URL set for this link");
      const result = await tryLocalScraper(competitorUrl, competitorSlug);
      if (!result) {
        onScraperDown();
        throw new Error("Local scraper unreachable");
      }
      return api.patch(`/competitors/links/${linkId}/price`, result);
    },
    onSuccess: onDone,
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title="Fetch latest price"
      className="p-1 text-gray-400 hover:text-primary disabled:opacity-40"
    >
      <RefreshCw size={12} />
    </button>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

const DetailPanel = memo(function DetailPanel({
  row,
  competitors,
  onClose,
  onEditLink,
  onFetched,
  onScraperDown,
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 flex flex-col z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="min-w-0 pr-2">
          {row.productBrand && (
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {row.productBrand}
            </p>
          )}
          <h2 className="text-sm font-semibold text-gray-900 leading-snug">
            {row.productName}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">
            {row.productSku}
            {row.productVolumeMl ? ` · ${row.productVolumeMl}mL` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Stock + pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3">
            <p className="text-xs text-gray-400 mb-0.5">In stock</p>
            <p className="text-lg font-bold text-gray-900">{row.stock}</p>
            <p className="text-xs text-gray-400">units</p>
          </div>
          <div className="bg-primary/5 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Our price</p>
            <p className="text-lg font-bold text-primary">
              {fmtPrice(row.ourPrice)}
            </p>
            <p className="text-xs text-gray-400">per unit</p>
          </div>
        </div>
        {(row.caseOf != null || row.casePrice != null) && (
          <div className="grid grid-cols-2 gap-3 -mt-2">
            {row.caseOf != null && (
              <div className="bg-gray-50 p-3">
                <p className="text-xs text-gray-400 mb-0.5">Case size</p>
                <p className="text-lg font-bold text-gray-900">{row.caseOf}</p>
                <p className="text-xs text-gray-400">units/case</p>
              </div>
            )}
            {row.casePrice != null && (
              <div className="bg-gray-50 p-3">
                <p className="text-xs text-gray-400 mb-0.5">Case price</p>
                <p className="text-lg font-bold text-gray-900">
                  {fmtPrice(row.casePrice)}
                </p>
                <p className="text-xs text-gray-400">per case</p>
              </div>
            )}
          </div>
        )}

        {/* Competitor prices */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Competitor Prices
          </p>
          {competitors.length === 0 && (
            <p className="text-sm text-gray-400">No competitors configured.</p>
          )}
          <div className="space-y-2">
            {competitors.map((c) => {
              const cp = row.prices.find((p) => p.competitorId === c.id);
              const delta = cp?.price != null ? row.ourPrice - cp.price : null;
              return (
                <div
                  key={c.id}
                  className="p-3 border border-gray-100 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {cp && (
                        <FetchLinkButton
                          linkId={cp.linkId}
                          competitorUrl={cp.url}
                          competitorSlug={cp.competitorSlug}
                          onDone={onFetched}
                          onScraperDown={onScraperDown}
                        />
                      )}
                      <button
                        onClick={() => onEditLink(c)}
                        title={cp ? "Edit URL" : "Add URL"}
                        className="p-1 text-gray-400 hover:text-primary"
                      >
                        {cp ? <Edit2 size={12} /> : <Plus size={12} />}
                      </button>
                    </div>
                  </div>
                  {cp ? (
                    <div className="space-y-1">
                      {cp.price != null ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">
                            {fmtPrice(cp.price)}
                          </span>
                          {delta !== null && (
                            <span
                              className={`text-xs font-medium ${getDeltaClass(delta)}`}
                            >
                              {getDeltaLabel(delta)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          URL set — fetch to get price
                        </p>
                      )}
                      {cp.url && (
                        <a
                          href={cp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline truncate"
                        >
                          <ExternalLink size={10} />
                          <span className="truncate">{cp.url}</span>
                        </a>
                      )}
                      {cp.lastFetchedAt && (
                        <p className="text-[10px] text-gray-400">
                          Fetched {fmtDate(cp.lastFetchedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No link yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Fetch All button (per competitor tab) ─────────────────────────────────────

function FetchAllButton({ competitor, links, onDone, onScraperDown }) {
  const [progress, setProgress] = useState(null);

  async function fetchAll() {
    if (links.length === 0) return;
    setProgress({ done: 0, total: links.length });

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const result = await tryLocalScraper(link.url, competitor.slug);
      if (result === null && i === 0) {
        onScraperDown();
        setProgress(null);
        return;
      }
      if (result) {
        await api
          .patch(`/competitors/links/${link.linkId}/price`, result)
          .catch(() => {});
      }
      setProgress({ done: i + 1, total: links.length });
    }

    setProgress(null);
    onDone();
  }

  const isPending = progress !== null;

  return (
    <button
      onClick={() => void fetchAll()}
      disabled={isPending}
      className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-medium px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
    >
      <RefreshCw size={12} />
      {isPending
        ? `Fetching… ${progress.done}/${progress.total}`
        : `Fetch All ${competitor.name} Prices`}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Compare() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editLinkModal, setEditLinkModal] = useState(null);
  const [addCompetitorOpen, setAddCompetitorOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [scraperDown, setScraperDown] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["competitors-summary"],
    queryFn: () => api.get("/competitors/summary"),
  });

  const liveSelectedRow = useMemo(
    () =>
      selectedRow
        ? (data?.rows.find((r) => r.productId === selectedRow.productId) ??
          selectedRow)
        : null,
    [selectedRow, data],
  );

  const invalidate = useCallback(
    () => void qc.invalidateQueries({ queryKey: ["competitors-summary"] }),
    [qc],
  );

  const addMutation = useMutation({
    mutationFn: () =>
      api.post("/competitors", {
        name: newName.trim(),
        slug: newSlug.trim(),
        baseUrl: newBaseUrl.trim(),
      }),
    onSuccess: () => {
      invalidate();
      setAddCompetitorOpen(false);
      setNewName("");
      setNewSlug("");
      setNewBaseUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/competitors/${id}`),
    onSuccess: (_, deletedId) => {
      invalidate();
      const idx = competitors.findIndex((c) => c.id === deletedId);
      if (idx !== -1 && activeTab >= idx)
        setActiveTab(Math.max(0, activeTab - 1));
    },
  });

  function toSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const competitors = data?.competitors ?? [];
  const activeCompetitor = competitors[activeTab] ?? null;

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;

    // Tab filter: only show rows that have a link for the active competitor
    if (activeCompetitor) {
      rows = rows.filter((r) =>
        r.prices.some((p) => p.competitorId === activeCompetitor.id),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.productSku.toLowerCase().includes(q) ||
          (r.productBrand?.toLowerCase().includes(q) ?? false),
      );
    }

    if (filter === "cheaper")
      rows = rows.filter((r) => r.delta !== null && r.delta < 0);
    else if (filter === "expensive")
      rows = rows.filter((r) => r.delta !== null && r.delta > 0);
    else if (filter === "unmatched")
      rows = rows.filter(
        (r) =>
          !r.prices.some(
            (p) =>
              activeCompetitor &&
              p.competitorId === activeCompetitor.id &&
              p.price != null,
          ),
      );

    return rows;
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [data, search, filter, activeCompetitor]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Cheaper / more expensive / no link counts
  const cheaperCount = filteredRows.filter(
    (r) => r.delta !== null && r.delta < 0,
  ).length;
  const expensiveCount = filteredRows.filter(
    (r) => r.delta !== null && r.delta > 0,
  ).length;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Loading comparison data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">
        Failed to load data: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">
          Price Comparison
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Manually enter competitor URLs per product, then fetch prices to
          compare.
        </p>
      </div>

      {/* Scraper-down banner */}
      {scraperDown && (
        <div className="mx-6 mt-3 border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 shrink-0">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-medium">Local scraper is not running</p>
            <p className="mt-1 text-xs text-amber-700">
              Prices are fetched from your local machine to bypass IP blocks.
              Start the scraper with these steps:
            </p>
            <ol className="mt-1.5 text-xs text-amber-800 space-y-1 list-decimal list-inside">
              <li>
                Open a terminal and go to the scraper folder:{" "}
                <code className="bg-amber-100 px-1 font-mono">
                  cd sipnow_scraper
                </code>
              </li>
              <li>
                Install dependencies (first time only):{" "}
                <code className="bg-amber-100 px-1 font-mono">
                  pip install fastapi uvicorn
                </code>
              </li>
              <li>
                Start the server:{" "}
                <code className="bg-amber-100 px-1 font-mono">
                  python server.py
                </code>
              </li>
            </ol>
          </div>
          <button
            onClick={() => setScraperDown(false)}
            className="shrink-0 text-amber-400 hover:text-amber-600 self-start"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Competitor tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-gray-100 bg-white shrink-0 overflow-x-auto">
        {competitors.length > 0 && (
          <button
            onClick={() => {
              setActiveTab(-1);
              setPage(1);
              setFilter("all");
            }}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap ${
              activeTab === -1
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Products ({data?.rows.length ?? 0})
          </button>
        )}
        {competitors.map((c, i) => {
          const linked =
            data?.rows.filter((r) =>
              r.prices.some((p) => p.competitorId === c.id),
            ).length ?? 0;
          return (
            <div key={c.id} className="flex items-center group">
              <button
                onClick={() => {
                  setActiveTab(i);
                  setPage(1);
                  setFilter("all");
                }}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap ${
                  activeTab === i
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {c.name} ({linked})
              </button>
              <button
                type="button"
                title={`Delete ${c.name}`}
                onClick={() => {
                  if (
                    globalThis.confirm(
                      `Delete "${c.name}" and all its product links? This cannot be undone.`,
                    )
                  )
                    deleteMutation.mutate(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 -ml-1 mb-0.5"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setAddCompetitorOpen(true)}
          title="Add competitor"
          className="ml-1 mb-0.5 p-1 text-gray-400 hover:text-primary hover:bg-primary/5 shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white shrink-0 flex flex-wrap items-center gap-3">
        {/* Search */}
        <SearchInput
          className="flex-1 min-w-48"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name or SKU…"
        />

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {["all", "cheaper", "expensive", "unmatched"].map((f) => {
            const labels = {
              all: `All (${filteredRows.length})`,
              cheaper: `We're cheaper (${cheaperCount})`,
              expensive: `They're cheaper (${expensiveCount})`,
              unmatched: "No price",
            };
            return (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs border ${
                  filter === f
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Fetch all button for active competitor */}
        {activeCompetitor && (
          <FetchAllButton
            competitor={activeCompetitor}
            links={
              data?.rows.flatMap((r) =>
                r.prices
                  .filter(
                    (p) => p.competitorId === activeCompetitor.id && !!p.url,
                  )
                  .map((p) => ({ linkId: p.linkId, url: p.url })),
              ) ?? []
            }
            onDone={invalidate}
            onScraperDown={() => setScraperDown(true)}
          />
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-3">
        {pageRows.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No products match the current filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Product</th>
                <th className="text-right pb-2 font-medium">Our Price</th>
                <th className="text-right pb-2 font-medium hidden sm:table-cell">
                  Stock
                </th>
                {activeCompetitor ? (
                  <>
                    <th className="text-right pb-2 font-medium">Their Price</th>
                    <th className="text-right pb-2 font-medium">Delta</th>
                    <th className="text-center pb-2 font-medium">Link</th>
                  </>
                ) : (
                  competitors.map((c) => (
                    <th
                      key={c.id}
                      className="text-right pb-2 font-medium whitespace-nowrap"
                    >
                      {c.name}
                    </th>
                  ))
                )}
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.map((row) => {
                const isSelected = selectedRow?.productId === row.productId;
                const cp = activeCompetitor
                  ? row.prices.find(
                      (p) => p.competitorId === activeCompetitor.id,
                    )
                  : null;
                return (
                  <tr
                    key={row.productId}
                    onClick={() => setSelectedRow(isSelected ? null : row)}
                    className={`cursor-pointer hover:bg-gray-50/60 ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Product name */}
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-900 leading-snug line-clamp-1">
                        {productLabel(row)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {row.productSku}
                        {row.productVolumeMl
                          ? ` · ${row.productVolumeMl}mL`
                          : ""}
                      </p>
                    </td>

                    {/* Our price */}
                    <td className="py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {fmtPrice(row.ourPrice)}
                    </td>

                    {/* Stock */}
                    <td className="py-2.5 text-right hidden sm:table-cell">
                      <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                        {row.stock}
                      </span>
                    </td>

                    {activeCompetitor ? (
                      <>
                        {/* Their price */}
                        <td className="py-2.5 text-right text-gray-700 whitespace-nowrap">
                          {cp?.price != null ? (
                            fmtPrice(cp.price)
                          ) : cp ? (
                            <span className="text-xs text-gray-400 italic">
                              URL set
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Delta */}
                        <td
                          className={`py-2.5 text-right whitespace-nowrap ${getDeltaClass(cp?.price != null ? row.ourPrice - cp.price : null)}`}
                        >
                          <span className="flex items-center justify-end gap-0.5">
                            {cp?.price != null && row.ourPrice < cp.price && (
                              <TrendingDown size={12} />
                            )}
                            {cp?.price != null && row.ourPrice > cp.price && (
                              <TrendingUp size={12} />
                            )}
                            {cp?.price != null && row.ourPrice === cp.price && (
                              <Minus size={12} />
                            )}
                            {getDeltaLabel(
                              cp?.price != null
                                ? row.ourPrice - cp.price
                                : null,
                            )}
                          </span>
                        </td>

                        {/* Link status */}
                        <td className="py-2.5 text-center">
                          {cp ? (
                            cp.url ? (
                              <span title={cp.url}>
                                <Link2
                                  size={14}
                                  className="inline text-green-500"
                                />
                              </span>
                            ) : (
                              <Link2Off
                                size={14}
                                className="inline text-gray-300"
                              />
                            )
                          ) : (
                            <Link2Off
                              size={14}
                              className="inline text-gray-200"
                            />
                          )}
                        </td>
                      </>
                    ) : (
                      // All-products tab: show cheapest per competitor
                      competitors.map((c) => {
                        const cp2 = row.prices.find(
                          (p) => p.competitorId === c.id,
                        );
                        const delta2 =
                          cp2?.price != null ? row.ourPrice - cp2.price : null;
                        return (
                          <td
                            key={c.id}
                            className={`py-2.5 text-right whitespace-nowrap ${getDeltaClass(delta2)}`}
                          >
                            {cp2?.price != null ? (
                              fmtPrice(cp2.price)
                            ) : cp2 ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })
                    )}

                    {/* Row action */}
                    <td className="py-2.5 pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRow(isSelected ? null : row);
                        }}
                        className="p-1 text-gray-400 hover:text-primary"
                        title="View details"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={filteredRows.length}
          perPage={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Detail panel */}
      {selectedRow && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-20 bg-black/10 cursor-default"
            onClick={() => setSelectedRow(null)}
          />
          <DetailPanel
            row={liveSelectedRow}
            competitors={competitors}
            onClose={() => setSelectedRow(null)}
            onEditLink={(c) =>
              setEditLinkModal({ row: liveSelectedRow, competitor: c })
            }
            onFetched={invalidate}
            onScraperDown={() => setScraperDown(true)}
          />
        </>
      )}

      {/* Edit/Add link modal */}
      {editLinkModal && (
        <EditLinkModal
          row={editLinkModal.row}
          competitor={editLinkModal.competitor}
          onClose={() => setEditLinkModal(null)}
          onSaved={invalidate}
        />
      )}

      {/* Add Competitor modal */}
      {addCompetitorOpen && (
        <Modal
          title="Add Competitor"
          onClose={() => {
            setAddCompetitorOpen(false);
            setNewName("");
            setNewSlug("");
            setNewBaseUrl("");
          }}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddCompetitorOpen(false);
                  setNewName("");
                  setNewSlug("");
                  setNewBaseUrl("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate()}
                disabled={
                  addMutation.isPending ||
                  !newName.trim() ||
                  !newSlug.trim() ||
                  !newBaseUrl.trim()
                }
                className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {addMutation.isPending ? "Adding…" : "Add Competitor"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="comp-name"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Name *
              </label>
              <input
                id="comp-name"
                className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="e.g. Dan Murphy's"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(toSlug(e.target.value));
                }}
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="comp-slug"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Slug *{" "}
                <span className="font-normal text-gray-400">
                  (auto-generated, must be unique)
                </span>
              </label>
              <input
                id="comp-slug"
                className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary font-mono"
                placeholder="e.g. dan-murphys"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="comp-url"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Base URL *
              </label>
              <input
                id="comp-url"
                type="url"
                className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="e.g. https://www.danmurphys.com.au"
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
              />
            </div>
            {addMutation.error && (
              <p className="text-sm text-red-500">
                {addMutation.error.message}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
