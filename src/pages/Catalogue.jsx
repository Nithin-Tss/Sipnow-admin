import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Image as ImageIcon,
  GripVertical,
  Download,
  Upload,
} from "lucide-react";
import { api } from "../lib/api";

const LEVEL_LABELS = ["Category", "Subcategory", "Type"];
const LEVEL_INDENT = ["", "ml-6", "ml-12"];
const LEVEL_DOT = ["bg-primary", "bg-primary/60", "bg-primary/30"];

function normalize(nodes) {
  return nodes.map((n) => ({ ...n, children: normalize(n.children ?? []) }));
}

export default function Catalogue() {
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(new Set());
  const [adding, setAdding] = useState(null);
  const [addName, setAddName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const importFileRef = useRef(null);
  const [importPending, setImportPending] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const {
    data: tree = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["catalogue"],
    queryFn: () => api.get("/admin/catalogue"),
    select: normalize,
  });

  const addMutation = useMutation({
    mutationFn: ({ name, parentId }) =>
      api.post("/admin/catalogue", { name, parentId }),
    onSuccess: (_, { parentId }) => {
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      setAdding(null);
      setAddName("");
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) =>
      api.put(`/admin/catalogue/${id}`, { name }),
    onSuccess: () => {
      setRenaming(null);
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/catalogue/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalogue"] }),
  });

  const saveImageMutation = useMutation({
    mutationFn: ({ id, url }) =>
      api.put(`/admin/catalogue/${id}`, { image: url || null }),
    onSuccess: () => {
      setEditingImage(null);
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items) =>
      api.put("/admin/catalogue/reorder", items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalogue"] }),
  });

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveAdd() {
    if (!addName.trim()) return;
    addMutation.mutate({
      name: addName.trim(),
      parentId: adding?.parentId ?? null,
    });
  }

  function saveRename() {
    if (!renaming || !renaming.name.trim()) return;
    renameMutation.mutate({ id: renaming.id, name: renaming.name.trim() });
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file || !editingImage) return;
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const result = await api.upload(
        "/admin/upload/image",
        form,
      );
      setEditingImage((prev) => (prev ? { ...prev, url: result.url } : null));
    } catch {
      // keep open
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleExport() {
    function strip(nodes) {
      return nodes.map((n) => ({
        name: n.name,
        ...(n.children.length ? { children: strip(n.children) } : {}),
      }));
    }
    const blob = new Blob([JSON.stringify(strip(tree), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogue.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPending(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const nodes = JSON.parse(text);
      const result = await api.post(
        "/admin/catalogue/import",
        { nodes },
      );
      setImportStatus(result);
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
    } catch {
      setImportStatus("error");
    } finally {
      setImportPending(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  function startAdd(parentId, level) {
    setAdding({ parentId, level });
    setAddName("");
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
  }

  function handleDrop(target, siblings) {
    setDragOverId(null);
    if (!draggingId || draggingId === target.id) {
      setDraggingId(null);
      return;
    }
    const fromIndex = siblings.findIndex((s) => s.id === draggingId);
    if (fromIndex === -1) {
      setDraggingId(null);
      return;
    } // different group — ignore
    const toIndex = siblings.findIndex((s) => s.id === target.id);
    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderMutation.mutate(reordered.map((n, i) => ({ id: n.id, order: i })));
    setDraggingId(null);
  }

  function renderNode(node, level, siblings) {
    const isOpen = expanded.has(node.id);
    const hasChildren =
      node.children.length > 0 || adding?.parentId === node.id;
    const canAddChild = level < 2;
    const isEditingImage = level === 0 && editingImage?.id === node.id;
    const isDragging = draggingId === node.id;
    const isDragOver =
      dragOverId === node.id &&
      draggingId !== node.id &&
      siblings.some((s) => s.id === draggingId);

    return (
      <div key={node.id} className={LEVEL_INDENT[level]}>
        <div
          draggable
          onDragStart={() => setDraggingId(node.id)}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId(node.id);
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(node, siblings);
          }}
          className={[
            "group flex items-center gap-2 py-1.5 pr-2",
            isDragging ? "opacity-40" : "hover:bg-gray-50",
            isDragOver ? "border-t-2 border-primary bg-primary/5" : "",
          ].join(" ")}
        >
          {/* grip handle */}
          <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none">
            <GripVertical size={13} />
          </span>

          {/* expand toggle */}
          <button
            onClick={() => toggle(node.id)}
            className={`w-5 h-5 flex items-center justify-center text-gray-300 ${hasChildren ? "hover:text-gray-600" : "invisible"}`}
          >
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          <span
            className={`w-1.5 h-1.5 shrink-0 ${LEVEL_DOT[level]}`}
          />

          {/* name / rename input */}
          {renaming?.id === node.id ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                autoFocus
                value={renaming.name}
                onChange={(e) =>
                  setRenaming({ ...renaming, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setRenaming(null);
                }}
                className="flex-1 border border-primary/40 px-2 py-0.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveRename}
                disabled={renameMutation.isPending}
                className="text-green-600 hover:text-green-700 p-0.5 disabled:opacity-50"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setRenaming(null)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <span className="flex-1 text-sm text-gray-800">{node.name}</span>
          )}

          {/* image thumbnail for level-0 */}
          {level === 0 && (
            <div className="w-6 h-6 overflow-hidden shrink-0 border border-gray-100">
              {node.image ? (
                <img
                  src={node.image}
                  alt={node.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ImageIcon size={10} className="text-gray-300" />
                </div>
              )}
            </div>
          )}

          {/* slug badge */}
          <span className="hidden group-hover:inline text-[10px] text-gray-400 font-mono">
            {node.slug}
          </span>

          {/* actions */}
          <div className="hidden group-hover:flex items-center gap-0.5">
            {level === 0 && (
              <button
                onClick={() =>
                  setEditingImage({ id: node.id, url: node.image ?? "" })
                }
                title="Set image"
                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5"
              >
                <ImageIcon size={12} />
              </button>
            )}
            {canAddChild && (
              <button
                onClick={() => startAdd(node.id, level + 1)}
                title={`Add ${LEVEL_LABELS[level + 1]}`}
                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5"
              >
                <Plus size={12} />
              </button>
            )}
            <button
              onClick={() => setRenaming({ id: node.id, name: node.name })}
              title="Rename"
              className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => deleteMutation.mutate(node.id)}
              disabled={
                deleteMutation.isPending && deleteMutation.variables === node.id
              }
              title="Delete"
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* inline image editor */}
        {isEditingImage && (
          <div className="ml-7 mb-2 flex flex-wrap items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-2">
            {editingImage.url && (
              <img
                src={editingImage.url}
                alt="preview"
                className="w-10 h-10 object-cover border border-gray-200 shrink-0"
              />
            )}
            <input
              type="text"
              value={editingImage.url}
              onChange={(e) =>
                setEditingImage({ ...editingImage, url: e.target.value })
              }
              placeholder="Paste image URL…"
              className="flex-1 min-w-40 border border-primary/40 px-2 py-1 text-sm outline-none focus:border-primary"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              className="text-xs border border-primary/40 text-primary px-2 py-1 hover:bg-primary hover:text-white disabled:opacity-50"
            >
              {imageUploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={() =>
                saveImageMutation.mutate({
                  id: editingImage.id,
                  url: editingImage.url,
                })
              }
              disabled={saveImageMutation.isPending || imageUploading}
              className="text-xs bg-primary text-white px-2 py-1 disabled:opacity-50"
            >
              {saveImageMutation.isPending ? "…" : "Save"}
            </button>
            <button
              onClick={() => setEditingImage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* children */}
        {isOpen && (
          <div>
            {node.children.map((child) =>
              renderNode(child, level + 1, node.children),
            )}
            {adding?.parentId === node.id && renderAddInput(level + 1)}
          </div>
        )}
      </div>
    );
  }

  function renderAddInput(level) {
    return (
      <div
        className={`${LEVEL_INDENT[level]} flex items-center gap-2 py-1.5 pr-2`}
      >
        <span className="w-4 shrink-0" />
        <span className="w-5" />
        <span
          className={`w-1.5 h-1.5 shrink-0 ${LEVEL_DOT[level]}`}
        />
        <input
          autoFocus
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveAdd();
            if (e.key === "Escape") {
              setAdding(null);
              setAddName("");
            }
          }}
          placeholder={`New ${LEVEL_LABELS[level]} name…`}
          className="flex-1 border border-primary/40 px-2 py-0.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={saveAdd}
          disabled={addMutation.isPending || !addName.trim()}
          className="text-xs bg-primary text-white px-2 py-0.5 disabled:opacity-50"
        >
          {addMutation.isPending ? "…" : "Add"}
        </button>
        <button
          onClick={() => {
            setAdding(null);
            setAddName("");
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Catalogue</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={tree.length === 0}
            title="Export catalogue as JSON"
            className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={13} /> Export
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importPending}
            title="Import catalogue from JSON"
            className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload size={13} /> {importPending ? "Importing…" : "Import"}
          </button>
          <button
            onClick={() => startAdd(null, 0)}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
          >
            <Plus size={13} /> Add Category
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Manage the 3-level product hierarchy:{" "}
        <span className="font-medium">Category → Subcategory → Type</span>. Drag
        the grip handle to reorder. Hover a row to rename, add a child, or
        delete it.
      </p>

      {importStatus && (
        <div
          className={`mb-4 text-sm px-3 py-2 flex items-center justify-between ${
            importStatus === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          <span>
            {importStatus === "error"
              ? "Import failed — check that the file is a valid catalogue JSON."
              : `Imported: ${importStatus.created} created, ${importStatus.skipped} skipped.`}
          </span>
          <button
            onClick={() => setImportStatus(null)}
            className="ml-4 opacity-60 hover:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      <div className="bg-white border border-gray-100 p-4">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : (
          <>
            {tree.map((node) => renderNode(node, 0, tree))}
            {adding?.parentId === null && renderAddInput(0)}
            {tree.length === 0 && !adding && (
              <p className="text-sm text-gray-400 py-6 text-center">
                No categories yet. Add one above.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
