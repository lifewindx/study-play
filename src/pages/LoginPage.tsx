import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/db";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/classes");
  }

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
            minLength={6}
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
