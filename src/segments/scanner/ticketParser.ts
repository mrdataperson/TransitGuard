import type { Ticket, TicketSource } from '../../contract/types';

const NAME = String.raw`([A-Za-z][A-Za-z .'()-]*?)`;
const FROM_END = String.raw`(?=\s+to\b|\s*[\n,;|\d₹]|\s*$)`;
const TO_END = String.raw`(?=\s*[\n,;|\d₹]|\s+(?:fare|amount|total|rs|inr|route|rt|bus|adult|child|date|time)\b|\s*$)`;

const ROUTE_RE = /\b(?:route|rt|bus)\s*(?:no|number|#)?\s*[:.-]?\s*([0-9]{1,3}[A-Z]{0,3})\b/i;
const FROM_RE = new RegExp(String.raw`\bfrom\b\s*[:\-]?\s*${NAME}${FROM_END}`, 'i');
const TO_RE = new RegExp(String.raw`\bto\b\s*[:\-]?\s*${NAME}${TO_END}`, 'i');
const ARROW_RE = new RegExp(String.raw`${NAME}\s*(?:->|→|=>)\s*${NAME}${TO_END}`, 'i');
const NUMBERED_STOP = String.raw`(\d{1,3}\s*[-–]\s*[A-Za-z][A-Za-z .'()-]*?)`;
const NUMBERED_STOP_PAIR_RE = new RegExp(
  String.raw`${NUMBERED_STOP}\s+\bto\b\s+${NUMBERED_STOP}${TO_END}`,
  'i',
);
const FARE_LABEL_RE =
  /(?:fare|amount|total|price)\s*(?:\(?(?:rs\.?|inr|₹)\)?)?\s*[:\-=]?\s*(?:rs\.?|inr|₹)?\s*(\d{1,5}(?:\.\d{1,2})?)/i;
const FARE_CURRENCY_RE = /(?:rs\.?|inr|₹)\s*(\d{1,5}(?:\.\d{1,2})?)/i;

interface Fields {
  routeNo: string;
  from: string;
  to: string;
  fare: number | null;
}

const clean = (s: string) =>
  s.replace(/\s+/g, ' ').replace(/^[\s:.\-–]+|[\s:.\-–]+$/g, '').trim();

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.(-])([a-z])/g, (_m, sep: string, c: string) => sep + c.toUpperCase());

const round2 = (n: number) => Math.round(n * 100) / 100;

function build(f: Fields, source: TicketSource, rawText: string): Ticket {
  const confidence = round2(
    (f.routeNo ? 0.2 : 0) + (f.from ? 0.25 : 0) + (f.to ? 0.35 : 0) + (f.fare !== null ? 0.2 : 0),
  );
  return {
    routeNo: f.routeNo,
    from: f.from,
    to: f.to,
    fare: f.fare ?? 0,
    confidence,
    source,
    rawText,
  };
}

function fromJson(raw: string): Fields | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    const rec = o as Record<string, unknown>;
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = rec[k];
        if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
      }
      return '';
    };
    const fareStr = get('fare', 'amount', 'price', 'total');
    const fields: Fields = {
      routeNo: get('routeNo', 'route', 'route_no', 'routeno').toUpperCase(),
      from: titleCase(get('from', 'source')),
      to: titleCase(get('to', 'destination', 'dest')),
      fare: fareStr !== '' && Number.isFinite(Number(fareStr)) ? Number(fareStr) : null,
    };
    const any = fields.routeNo || fields.from || fields.to || fields.fare !== null;
    return any ? fields : null;
  } catch {
    return null;
  }
}

function fromText(text: string): Fields {
  const routeNo = (text.match(ROUTE_RE)?.[1] ?? '').toUpperCase();

  let from = clean(text.match(FROM_RE)?.[1] ?? '');
  let to = clean(text.match(TO_RE)?.[1] ?? '');
  if (!from && !to) {
    const numberedStops = text.match(NUMBERED_STOP_PAIR_RE);
    if (numberedStops) {
      from = clean(numberedStops[1]).replace(/^(\d{1,3})\s*[-–]\s*/, '$1-');
      to = clean(numberedStops[2]).replace(/^(\d{1,3})\s*[-–]\s*/, '$1-');
    } else {
      const arrow = text.match(ARROW_RE);
      from = clean(arrow?.[1] ?? '');
      to = clean(arrow?.[2] ?? '');
    }
  }

  const fareStr = text.match(FARE_LABEL_RE)?.[1] ?? text.match(FARE_CURRENCY_RE)?.[1];
  return {
    routeNo,
    from: titleCase(from),
    to: titleCase(to),
    fare: fareStr !== undefined ? Number(fareStr) : null,
  };
}

// Takes raw QR payload or OCR text, returns a Ticket with a confidence score.
// Missing fields come back as '' (fare as 0) so the UI can ask the user to fill them.
export function parseTicket(raw: string, source: TicketSource): Ticket {
  const text = raw.trim();
  const json = fromJson(text);
  return build(json ?? fromText(text), source, text);
}