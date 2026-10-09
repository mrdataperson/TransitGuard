import type { AlertLevel, Destination, GeoPoint, Ticket, Trip } from './types';
import type { RingRadius } from './constants';

export interface EventMap {
  TICKET_SCANNED: { ticket: Ticket };
  DESTINATION_CONFIRMED: { tripId: string; destination: Destination };
  TRIP_STARTED: { trip: Trip };
  POSITION_UPDATED: { tripId: string; position: GeoPoint };
  RING_ENTERED: { tripId: string; radius: RingRadius; distanceM: number };
  ALERT_STARTED: { tripId: string; level: AlertLevel; radius: RingRadius };
  ALERT_DISMISSED: { tripId: string };
  SOS_TRIGGERED: { tripId: string; position?: GeoPoint };
  ARRIVED_SAFE: { tripId: string };
    TRIP_ENDED: { trip: Trip; reason: 'arrived' | 'stopped' };
}

export type EventName = keyof EventMap;