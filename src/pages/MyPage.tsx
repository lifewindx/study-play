import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { supabase, clearAllUserData, clearStudyHistory } from "../lib/db";
import { Trash2Icon, MoonIcon, SunIcon } from "../components/Icons";

export function MyPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }
    setPwError("");
    setPwMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwMessage("Password updated");
      setNewPassword("");
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    await clearAllUserData();
    await signOut();
    setDeleting(false);
    navigate("/login");
  }

  async function handleClearHistory() {
    setClearing(true);
    await clearStudyHistory();
    setClearing(false);
  }

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="page-shell max-w-lg space-y-8">
      <div>
        <p className="section-title mb-2">My page</p>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Account
        </h1>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Email</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{user?.email}</div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Display</h3>
        <button
          onClick={toggleTheme}
          className="btn-ghost text-sm w-full justify-between"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
            {theme === "dark" ? "Dark" : "Light"} mode
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Tap to switch
          </span>
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Change password</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            placeholder="New password (6+ characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field"
            minLength={6}
          />
          {pwError && <p className="text-xs" style={{ color: "var(--danger, #ef4444)" }}>{pwError}</p>}
          {pwMessage && <p className="text-xs" style={{ color: "var(--success, #11895b)" }}>{pwMessage}</p>}
          <button type="submit" className="btn-primary text-sm">
            Update password
          </button>
        </form>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Data</h3>
        <button
          onClick={handleClearHistory}
          disabled={clearing}
          className="btn-ghost text-sm w-full justify-between"
        >
          <span>Clear study history</span>
          <Trash2Icon className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </button>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Removes all calendar records. Classes, lessons, and segments are kept.
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--danger, #ef4444)" }}>Danger zone</h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-sm w-full justify-between"
            style={{ color: "var(--danger, #ef4444)", borderColor: "var(--danger, #ef4444)" }}
          >
            <span>Delete account</span>
            <Trash2Icon className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              All your data will be permanently deleted. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              placeholder='Type DELETE to confirm'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="input-field"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="btn-primary text-sm disabled:opacity-40"
                style={{ backgroundColor: "var(--danger, #ef4444)" }}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Permanently deletes all your data. You can sign up again later.
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="btn-ghost text-sm w-full"
      >
        Sign out
      </button>
    </div>
  );
}
