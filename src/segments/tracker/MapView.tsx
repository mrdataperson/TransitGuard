import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RADII } from '../../contract/constants';
import type { GeoPoint } from '../../contract/types';

type LatLng = Pick<GeoPoint, 'lat' | 'lng'>;

interface Props {
  destination: LatLng;
  position: LatLng | null;
}

export default function MapView({ destination, position }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userRef = useRef<L.CircleMarker | null>(null);
  const fittedRef = useRef(false);

  // Map, destination marker and the three rings
  useEffect(() => {
    if (!el.current) return;
    const center: L.LatLngExpression = [destination.lat, destination.lng];
    const map = L.map(el.current).setView(center, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.circleMarker(center, { radius: 8, color: '#A32D2D', fillColor: '#E24B4A', fillOpacity: 1 }).addTo(map);
    RADII.forEach((r) => {
      L.circle(center, { radius: r, color: '#D85A30', weight: 1, fillOpacity: 0.05 }).addTo(map);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      userRef.current = null;
      fittedRef.current = false;
    };
  }, [destination.lat, destination.lng]);

  // User marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    const at: L.LatLngExpression = [position.lat, position.lng];
    if (!userRef.current) {
      userRef.current = L.circleMarker(at, {
        radius: 7,
        color: '#185FA5',
        fillColor: '#378ADD',
        fillOpacity: 1,
      }).addTo(map);
    } else {
      userRef.current.setLatLng(at);
    }
    if (!fittedRef.current) {
      map.fitBounds(L.latLngBounds([[destination.lat, destination.lng], at]).pad(0.3));
      fittedRef.current = true;
    }
  }, [position, destination.lat, destination.lng]);

  return <div ref={el} className="h-72 w-full overflow-hidden rounded" />;
}