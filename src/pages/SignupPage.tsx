import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { sanitizeError, validatePassword } from "../lib/errors";

export function SignupPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setSuccess(false);
    setLoading(true);
    try {
      await authApi.signup(email, password);
      await refresh();
      setSuccess(true);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Account created
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Your account for <strong>{email}</strong> is ready.
          </p>
          <Link to="/classes" className="btn-primary inline-block">
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          StudyPlay
        </h1>
        <p className="mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
            maxLength={254}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password (8+ chars, special char)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
            maxLength={128}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            required
            maxLength={128}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--danger, #ef4444)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-medium" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
