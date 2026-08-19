export default function DeleteModalActions({
  formErr,
  isPending,
  onCancel,
  onDelete,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
}) {
  return (
    <>
      {formErr && <p className="text-sm text-red-600 mt-2">{formErr}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onCancel}
          className="text-sm rounded-lg text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="text-sm rounded-lg border border-red-600 text-red-600 px-4 py-2 hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </>
  );
}
