import { useCallback, useEffect, useState } from 'react';
import { addParentByEmail, listMyParents, removeLink, type ParentLink } from './parentLink';

// Child only: add or remove the parents who can see your trips
export default function LinkPanel() {
  const [parents, setParents] = useState<ParentLink[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setParents(await listMyParents());
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load parents' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await addParentByEmail(email);
      setMsg({ ok: true, text: 'Parent added.' });
      setEmail('');
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not add parent' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this parent? They will stop seeing your trips.')) return;
    try {
      await removeLink(id);
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not remove parent' });
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-3 p-4">
      <h2 className="text-lg font-medium">Your parents</h2>
      <p className="text-sm text-gray-600">
        Parents you add here can see your live trips once they have an Adult account with that email.
      </p>

      {msg && (
        <p className={`rounded p-2 text-sm ${msg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Parent's email"
          className="flex-1 rounded border p-2 text-sm"
        />
        <button
          onClick={() => void add()}
          disabled={busy}
          className="rounded bg-black px-4 text-sm text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {parents.length === 0 ? (
        <p className="rounded border p-3 text-sm text-gray-600">No parents linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded border p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name ?? p.email}</div>
                {p.name && <div className="truncate text-xs text-gray-600">{p.email}</div>}
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                    p.name ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.name ? 'Linked' : 'Waiting for them to sign up'}
                </span>
              </div>
              <button onClick={() => void remove(p.id)} className="text-xs text-red-700 underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}