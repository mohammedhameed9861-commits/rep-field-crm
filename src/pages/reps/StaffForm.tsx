import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createStaffAccount } from "../../lib/reps";
import type { AppRole } from "../../lib/types";

const ROLE_LABEL: Record<AppRole, string> = {
  rep: "Rep",
  telesales: "Telesales",
  manager: "Manager",
};

export default function StaffForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("rep");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createStaffAccount({ email, password, full_name: fullName, role });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">Add Staff Account</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={field}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            dir="ltr"
          />
          <input
            required
            type="text"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            dir="ltr"
            minLength={6}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className={field}>
            {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Account"}
          </button>
          <p className="text-xs text-gray-400">
            Share the email and temporary password with them directly — there's no self-signup.
          </p>
        </form>
      </div>
    </div>
  );
}
