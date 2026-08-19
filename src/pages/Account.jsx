import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>

      <div className="bg-white border border-gray-100 p-4">
        <p className="text-xs font-medium text-gray-500 mb-0.5">Signed in as</p>
        <p className="font-semibold text-gray-900">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <span className="inline-block mt-1.5 text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 uppercase tracking-wide">
          {user?.role?.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
