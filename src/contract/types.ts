export type UserRole = 'adult' | 'child';

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number; // metres
  speed?: number; // m/s
  timestamp: number; // ms since epoch
}

export type TicketSource = 'qr' | 'ocr' | 'manual';

export interface Ticket {
  routeNo: string;
  from: string;
  to: string;
  fare: number; // rupees
  confidence: number; // 0 to 1; manual entry = 1
  source: TicketSource;
  rawText?: string;
}

export interface Destination {
  name: string;
  location?: GeoPoint; // filled once the stop is resolved on the map
}

export type TripStatus = 'active' | 'ended';

export interface Trip {
  id: string;
  userId: string;
  role: UserRole;
  ticket: Ticket;
  destination: Destination;
  status: TripStatus;
  startedAt: number;
  endedAt?: number;
}