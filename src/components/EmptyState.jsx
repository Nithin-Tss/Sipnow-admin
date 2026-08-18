export default function EmptyState({ message }) {
  return (
    <div className="bg-white border border-gray-200 p-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
