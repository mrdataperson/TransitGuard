import { useCallback, useEffect, useRef, useState } from 'react';
import { emit } from '../../contract/eventBus';
import { MIN_TICKET_CONFIDENCE } from '../../contract/constants';
import type { Ticket, TicketSource } from '../../contract/types';
import { parseTicket } from './ticketParser';
import { startQrScan } from './qrScanner';
import { readTicketImage } from './ocrScanner';

type Mode = 'qr' | 'photo' | 'manual';
interface Draft {
  routeNo: string;
  from: string;
  to: string;
  fare: string;
}

const FIELDS: { key: keyof Draft; label: string }[] = [
  { key: 'routeNo', label: 'Route no' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To (destination)' },
  { key: 'fare', label: 'Fare (₹)' },
];

export default function ScannerPage() {
  const [mode, setMode] = useState<Mode>('qr');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confidence, setConfidence] = useState(1);
  const [source, setSource] = useState<TicketSource>('manual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRaw = useCallback((raw: string, src: TicketSource) => {
    const t = parseTicket(raw, src);
    setSource(src);
    setConfidence(t.confidence);
    setDraft({
      routeNo: t.routeNo,
      from: t.from,
      to: t.to,
      fare: t.fare ? String(t.fare) : '',
    });
    setError(null);
  }, []);

  useEffect(() => {
    if (mode !== 'qr' || draft) return;
    const handle = { cancelled: false };
    let stop: (() => Promise<void>) | null = null;
    startQrScan('qr-reader', (text) => handleRaw(text, 'qr'), handle)
      .then((s) => {
        if (handle.cancelled) void s();
        else stop = s;
      })
      .catch(() => {
        if (!handle.cancelled) setError('Camera not available. Use photo or manual entry.');
      });
    return () => {
      handle.cancelled = true;
      if (stop) void stop();
    };
  }, [mode, draft, handleRaw]);

  useEffect(() => {
    if (mode !== 'photo' || draft || capturedImage) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not supported here. Choose a photo from your gallery instead.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (!videoElement) throw new Error('Camera preview is unavailable.');
        videoElement.srcObject = stream;
        await videoElement.play();
        if (!cancelled) setCameraReady(true);
      } catch (cause) {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        if (cancelled) return;

        const name = cause instanceof DOMException ? cause.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setError('Camera permission is blocked. Allow camera access or choose a photo from your gallery.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError('No usable camera was found. Choose a photo from your gallery instead.');
        } else {
          setError('Could not start the camera. Choose a photo from your gallery or try again.');
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement?.srcObject === stream) videoElement.srcObject = null;
    };
  }, [mode, draft, capturedImage]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Photo could not be loaded.'));
        };
        reader.onerror = () => reject(new Error('Photo could not be loaded.'));
        reader.readAsDataURL(file);
      });
      setCapturedImage(dataUrl);
    } catch {
      setError('Could not load the photo. Try another image.');
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || busy) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) {
      setError('Camera is still starting. Please try again in a moment.');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not capture the photo. Choose a photo from your gallery instead.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
  }

  async function predictCapturedPhoto() {
    if (!capturedImage || busy) return;
    setBusy(true);
    setError(null);
    try {
      handleRaw(await readTicketImage(capturedImage), 'ocr');
    } catch {
      setError('Could not read the photo. Retake it or enter manually.');
    } finally {
      setBusy(false);
    }
  }

  function chooseMode(m: Mode) {
    setMode(m);
    setCameraReady(false);
    setCapturedImage(null);
    setSent(false);
    setError(null);
    if (m === 'manual') {
      setSource('manual');
      setConfidence(1);
      setDraft({ routeNo: '', from: '', to: '', fare: '' });
    } else {
      setDraft(null);
    }
  }

  function confirm() {
    if (!draft) return;
    if (!draft.to.trim()) return setError('Destination is required');
    if (draft.fare.trim() === '' || !Number.isFinite(Number(draft.fare)) || Number(draft.fare) < 0) {
      return setError('Enter a valid fare');
    }
    const ticket: Ticket = {
      routeNo: draft.routeNo.trim().toUpperCase(),
      from: draft.from.trim(),
      to: draft.to.trim(),
      fare: Number(draft.fare),
      confidence,
      source,
    };
    emit('TICKET_SCANNED', { ticket });
    setCapturedImage(null);
    setDraft(null);
    setSent(true);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-medium">Scan ticket</h1>

      <div className="flex gap-2">
        {(['qr', 'photo', 'manual'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => chooseMode(m)}
            className={`flex-1 rounded border px-3 py-2 text-sm ${
              mode === m ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {m === 'qr' ? 'QR' : m === 'photo' ? 'Photo' : 'Manual'}
          </button>
        ))}
      </div>

      {sent && <p className="rounded bg-green-100 p-2 text-sm text-green-800">Ticket sent to tracker.</p>}
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}

      {mode === 'qr' && !draft && <div id="qr-reader" className="w-full overflow-hidden rounded" />}

      {mode === 'photo' && !draft && capturedImage && (
        <div className="space-y-3">
          <img
            src={capturedImage}
            alt="Captured ticket preview"
            className="max-h-[60vh] w-full rounded bg-black object-contain"
          />
          <p className="text-center text-sm text-gray-600">
            Photo is held temporarily on this screen. Review it, then predict the ticket details.
          </p>
          <button
            onClick={() => void predictCapturedPhoto()}
            disabled={busy}
            className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
          >
            {busy ? 'Predicting ticket details...' : 'Predict ticket details'}
          </button>
          <button
            onClick={() => {
              setCapturedImage(null);
              setError(null);
            }}
            disabled={busy}
            className="w-full rounded border p-3 text-sm disabled:opacity-50"
          >
            Retake / choose another photo
          </button>
        </div>
      )}

      {mode === 'photo' && !draft && !capturedImage && (
        <div className="space-y-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[60vh] w-full rounded bg-black object-contain"
            aria-label="Live ticket camera preview"
          />
          <button
            onClick={() => void capturePhoto()}
            disabled={!cameraReady || busy}
            className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
          >
            {busy ? 'Reading ticket...' : cameraReady ? 'Take photo and read ticket' : 'Starting camera...'}
          </button>
          <label className="block cursor-pointer rounded border p-3 text-center text-sm">
            Choose a photo from your phone
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void onPhoto(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <p className="text-center text-xs text-gray-600">
            Keep the ticket flat, well-lit, and fully inside the camera view.
          </p>
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          {(source === 'ocr' || (source === 'qr' && confidence < MIN_TICKET_CONFIDENCE)) && (
            <p className="rounded bg-amber-100 p-2 text-sm text-amber-800">
              Some details look unclear. Please check them.
            </p>
          )}
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              {f.label}
              <input
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                inputMode={f.key === 'fare' ? 'decimal' : 'text'}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          ))}
          <button onClick={confirm} className="w-full rounded bg-black p-2 text-white">
            Confirm ticket
          </button>
        </div>
      )}
    </div>
  );
}