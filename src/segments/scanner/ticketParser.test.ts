import { describe, it, expect } from 'vitest';
import { parseTicket } from './ticketParser';

describe('parseTicket', () => {
  it('parses a labelled ticket', () => {
    const t = parseTicket('ROUTE NO: 70A\nFROM: GANDHIPURAM TO: UKKADAM\nFARE: RS. 15.00', 'ocr');
    expect(t.routeNo).toBe('70A');
    expect(t.from).toBe('Gandhipuram');
    expect(t.to).toBe('Ukkadam');
    expect(t.fare).toBe(15);
    expect(t.confidence).toBe(1);
  });

  it('does not split on "to" inside a place name', () => {
    const t = parseTicket('FROM: Tondiarpet TO: Egmore\nFare 20', 'ocr');
    expect(t.from).toBe('Tondiarpet');
    expect(t.to).toBe('Egmore');
    expect(t.fare).toBe(20);
  });

  it('parses numbered stop names separated by "to"', () => {
    const t = parseTicket(
      'SALEM-REGION\n9-COLLEGE QUARTERS to 5-FIVE ROADS\nMALE(S) 1 * 8.0 = Rs 8.00',
      'ocr',
    );
    expect(t.from).toBe('9-College Quarters');
    expect(t.to).toBe('5-Five Roads');
  });

  it('parses numbered stops when OCR inserts spaces around the hyphen', () => {
    const t = parseTicket('9 - COLLEGE QUARTERS to 5 - FIVE ROADS', 'ocr');
    expect(t.from).toBe('9-College Quarters');
    expect(t.to).toBe('5-Five Roads');
  });

  it('parses arrow style with rupee symbol', () => {
    const t = parseTicket('Route 12\nChennai -> Madurai\nTotal ₹ 450', 'ocr');
    expect(t.routeNo).toBe('12');
    expect(t.from).toBe('Chennai');
    expect(t.to).toBe('Madurai');
    expect(t.fare).toBe(450);
  });

  it('parses a JSON QR payload', () => {
    const t = parseTicket('{"route":"21G","from":"Peelamedu","to":"Singanallur","fare":12}', 'qr');
    expect(t).toMatchObject({ routeNo: '21G', from: 'Peelamedu', to: 'Singanallur', fare: 12, source: 'qr' });
    expect(t.confidence).toBe(1);
  });

  it('returns zero confidence for garbage', () => {
    const t = parseTicket('hello world', 'ocr');
    expect(t.to).toBe('');
    expect(t.confidence).toBe(0);
  });

  it('lowers confidence when fields are missing', () => {
    const t = parseTicket('FROM: A TO: B', 'ocr');
    expect(t.confidence).toBeCloseTo(0.6);
  });
});