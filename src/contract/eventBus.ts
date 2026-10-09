import type { EventMap, EventName } from './events';

type Handler<K extends EventName> = (payload: EventMap[K]) => void;
type AnyHandler = (payload: never) => void;

const handlers = new Map<EventName, Set<AnyHandler>>();

export function on<K extends EventName>(event: K, handler: Handler<K>): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => off(event, handler);
}

export function off<K extends EventName>(event: K, handler: Handler<K>): void {
  handlers.get(event)?.delete(handler);
}

export function emit<K extends EventName>(event: K, payload: EventMap[K]): void {
  handlers.get(event)?.forEach((handler) => {
    try {
      (handler as Handler<K>)(payload);
    } catch (err) {
      // one segment's bug should never break the others
      console.error(`[eventBus] handler for ${event} failed`, err);
    }
  });
}