import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { inputCls } from "../lib/ui";
import { useAuth } from "../context/AuthContext";
import FormError from "../components/FormError";

export default function Account() {
  const { user } = useAuth();

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: (body) =>
      api.patch("/auth/password", body),
    onSuccess: () => {
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      setPwErr("");
      setPwOk(true);
    },
    onError: (err) => {
      setPwErr(err.message);
      setPwOk(false);
    },
  });

  function submitPassword(e) {
    e.preventDefault();
    setPwErr("");
    setPwOk(false);
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwErr("New passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwErr("New password must be at least 8 characters");
      return;
    }
    passwordMutation.mutate({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
  }

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>

      {/* Current user info */}
      <div className="bg-white border border-gray-100 p-4 mb-6">
        <p className="text-xs font-medium text-gray-500 mb-0.5">Signed in as</p>
        <p className="font-semibold text-gray-900">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <span className="inline-block mt-1.5 text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 uppercase tracking-wide">
          {user?.role.replace("_", " ")}
        </span>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Change Password
        </h3>
        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
              }
              className={inputCls}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, newPassword: e.target.value }))
              }
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={pwForm.confirm}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, confirm: e.target.value }))
              }
              className={inputCls}
              autoComplete="new-password"
            />
          </div>

          <FormError message={pwErr} />
          {pwOk && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-2">
              Password updated successfully.
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
            >
              {passwordMutation.isPending ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
