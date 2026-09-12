import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onError?: (message: string) => void;
}

const REGION_ID = 'fueliq-barcode-region';

/** Live camera barcode scanner backed by html5-qrcode. */
export function BarcodeScanner({ onDetected, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 160 } },
        (decodedText) => {
          if (cancelled) return;
          onDetected(decodedText);
        },
        () => {
          /* per-frame decode failures are normal; ignore */
        },
      )
      .then(() => !cancelled && setStatus('scanning'))
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus('error');
        onError?.(err instanceof Error ? err.message : 'Unable to access camera');
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && s.isScanning) {
        s.stop()
          .then(() => s.clear())
          .catch(() => undefined);
      }
    };
  }, [onDetected, onError]);

  return (
    <div>
      <div id={REGION_ID} className="overflow-hidden rounded-xl bg-black" />
      <p className="mt-2 text-center text-sm text-ink-600">
        {status === 'starting' && 'Starting camera…'}
        {status === 'scanning' && 'Point your camera at a barcode.'}
        {status === 'error' && 'Camera unavailable — check permissions or type the search instead.'}
      </p>
    </div>
  );
}
