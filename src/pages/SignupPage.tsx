import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/db";
import { sanitizeError } from "../lib/errors";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(sanitizeError(err));
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Check your email
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="btn-primary inline-block">
            Go to sign in
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
            autoFocus
          />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={8}
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
