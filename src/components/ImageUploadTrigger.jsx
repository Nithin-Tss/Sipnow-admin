export default function ImageUploadTrigger({
  inputRef,
  uploading,
  onFileSelect,
  helpText,
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Upload Image"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      <p className="text-xs text-gray-400 mt-1">{helpText}</p>
    </>
  );
}
