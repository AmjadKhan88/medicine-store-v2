import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

export function useBarcodeScanner({ onDetected, enabled = false }) {
  const videoRef        = useRef(null);
  const readerRef       = useRef(null);
  const controlsRef     = useRef(null);
  const [error, setError]       = useState(null);
  const [cameras, setCameras]   = useState([]);
  const [cameraId, setCameraId] = useState(null);
  const [scanning, setScanning] = useState(false);

  // List available cameras on mount
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices);
        // Prefer back camera on mobile
        const back = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setCameraId(back?.deviceId || devices[0]?.deviceId || null);
      })
      .catch(() => setError('Camera access denied. Allow camera permission and try again.'));
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !cameraId) return;
    setError(null);
    setScanning(true);

    try {
      readerRef.current = new BrowserMultiFormatReader();

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        cameraId,
        videoRef.current,
        (result, err) => {
          if (result) {
            onDetected(result.getText());
          }
          if (err && err?.name !== 'NotFoundException') {
            console.warn('[Scanner]', err);
          }
        }
      );
    } catch (err) {
      setError('Could not start camera. Make sure you are on HTTPS or localhost.');
      setScanning(false);
    }
  }, [cameraId, onDetected]);

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setScanning(false);
  }, []);

  // Auto start/stop when enabled changes
  useEffect(() => {
    if (enabled && cameraId) startScanning();
    else stopScanning();
    return () => stopScanning();
  }, [enabled, cameraId]);

  return {
    videoRef,
    error,
    cameras,
    cameraId,
    setCameraId,
    scanning,
    startScanning,
    stopScanning,
  };
}