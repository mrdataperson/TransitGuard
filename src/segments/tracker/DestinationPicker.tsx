import { useCallback, useEffect, useRef, useState } from 'react';
import type { Destination, GeoPoint, Ticket } from '../../contract/types';
import { distanceM } from '../../core/geo';

interface Candidate {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  ticket: Ticket;
  position: GeoPoint | null;
  onConfirm: (destination: Destination) => void;
  onCancel: () => void;
}

// OpenStreetMap Nominatim, free. Fine for development and light use.
async function searchPlaces(query: string, near: GeoPoint | null): Promise<Candidate[]> {
  const params = new URLSearchParams({
    q: `${query}, Tamil Nadu`,
    format: 'jsonv2',
    countrycodes: 'in',
    limit: '6',
  });
  if (near) {
    // bias results to ~50 km around the user (left, top, right, bottom)
    params.set('viewbox', [near.lng - 0.5, near.lat + 0.5, near.lng + 0.5, near.lat - 0.5].join(','));
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({
    label: r.display_name.split(',').slice(0, 2).join(',').trim(),
    address: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export default function DestinationPicker({ ticket, position, onConfirm, onCancel }: Props) {
  const [query, setQuery] = useState(ticket.to);
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const posRef = useRef<GeoPoint | null>(position);
  const hasPosition = position !== null;

  useEffect(() => {
    posRef.current = position;
  }, [position]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchPlaces(q.trim(), posRef.current));
      setSearched(true);
    } catch {
      setError('Could not search places. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search on open, and again once the first GPS fix arrives (better nearby ranking)
  useEffect(() => {
    void search(ticket.to);
  }, [ticket.to, hasPosition, search]);

  const rows = results
    .map((c) => ({ ...c, away: position ? distanceM(position, c) : null }))
    .sort((a, b) => (a.away ?? 0) - (b.away ?? 0));

  return (
    <div className="space-y-3">
      <div className="rounded border p-3 text-sm">
        <div className="font-medium">
          {ticket.routeNo ? `Route ${ticket.routeNo}: ` : ''}
          {ticket.from || '?'} → {ticket.to}
        </div>
        <div className="text-gray-600">Pick the correct destination stop to start tracking.</div>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border p-2 text-sm"
          placeholder="Search destination"
        />
        <button
          onClick={() => void search(query)}
          disabled={loading}
          className="rounded bg-black px-3 text-sm text-white disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-sm text-gray-600">Searching...</p>}
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}
      {!loading && searched && rows.length === 0 && !error && (
        <p className="text-sm text-gray-600">No places found. Try a different spelling.</p>
      )}

      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={`${c.lat},${c.lng}`}>
            <button
              onClick={() =>
                onConfirm({
                  name: c.label,
                  location: { lat: c.lat, lng: c.lng, timestamp: Date.now() },
                })
              }
              className="w-full rounded border p-3 text-left text-sm"
            >
              <div className="font-medium">{c.label}</div>
              <div className="truncate text-xs text-gray-600">{c.address}</div>
              {c.away !== null && (
                <div className="text-xs text-gray-600">{(c.away / 1000).toFixed(1)} km away</div>
              )}
            </button>
          </li>
        ))}
      </ul>

      <button onClick={onCancel} className="w-full rounded border p-2 text-sm">
        Cancel
      </button>
    </div>
  );
}