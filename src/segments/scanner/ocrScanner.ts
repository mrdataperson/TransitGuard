import { createWorker } from 'tesseract.js';

// Reads text from a ticket photo. English only for now.
export async function readTicketImage(image: File | string | HTMLCanvasElement): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}