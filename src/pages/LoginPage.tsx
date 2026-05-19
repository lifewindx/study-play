import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/db";
import { sanitizeError } from "../lib/errors";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResent(false);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      if (err.message.includes("Email not confirmed")) {
        setError("Email not confirmed");
      } else {
        setError(sanitizeError(err));
      }
      return;
    }
    navigate("/classes");
  }

  async function handleResendConfirmation() {
    if (!email) return;
    setResending(true);
    setError("");
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (err) {
      setError(sanitizeError(err));
      return;
    }
    setResent(true);
  }

  const isEmailNotConfirmed = error === "Email not confirmed";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
          StudyPlay
        </h1>
        <p className="mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
          />
          {error && !isEmailNotConfirmed && (
            <p className="text-sm" style={{ color: "var(--danger, #ef4444)" }}>
              {error}
            </p>
          )}
          {isEmailNotConfirmed && (
            <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                Email not confirmed. Check your inbox.
              </p>
              {resent && (
                <p className="text-xs" style={{ color: "var(--accent)" }}>
                  Confirmation email resent. Check your inbox.
                </p>
              )}
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="btn-ghost text-xs w-full"
              >
                {resending ? "Sending..." : "Resend confirmation email"}
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium" style={{ color: "var(--accent)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
