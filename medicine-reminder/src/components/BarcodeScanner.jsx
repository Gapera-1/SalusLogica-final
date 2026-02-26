import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import { useLanguage } from "../i18n";

/**
 * Barcode / QR-code scanner component using the device camera.
 *
 * Props:
 *   onScanSuccess(decodedText)  – called with the barcode string
 *   onClose()                   – called when the user dismisses the scanner
 */
const BarcodeScanner = ({ onScanSuccess, onClose }) => {
  const { t } = useLanguage();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.warn("[BarcodeScanner] stop error:", err);
    }
  }, []);

  // Enumerate cameras on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Check if running in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setError("Camera access requires HTTPS or localhost. Please use a secure connection.");
      return;
    }
    
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mountedRef.current) return;
        console.log("[BarcodeScanner] Found cameras:", devices);
        setCameras(devices);
        // Prefer rear camera
        const rear = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        setSelectedCamera(rear || devices[0] || null);
        
        if (devices.length === 0) {
          setError("No cameras found. Please ensure your device has a camera and you've granted permission.");
        }
      })
      .catch((err) => {
        console.error("[BarcodeScanner] getCameras error:", err);
        if (mountedRef.current) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError("Camera permission denied. Please allow camera access in your browser settings.");
          } else if (err.name === 'NotFoundError') {
            setError("No camera found on this device.");
          } else {
            setError(t("scanner.cameraPermissionError"));
          }
        }
      });

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner, t]);

  // Start scanning when a camera is selected
  useEffect(() => {
    if (!selectedCamera || !scannerRef.current) return;

    const startScanning = async () => {
      await stopScanner();

      const qrCode = new Html5Qrcode("barcode-scanner-region");
      html5QrCodeRef.current = qrCode;

      try {
        await qrCode.start(
          selectedCamera.id,
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.5,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          (decodedText) => {
            // Success
            if (mountedRef.current) {
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Error / no match — expected, ignored
          }
        );
        if (mountedRef.current) {
          setScanning(true);
          setError(null);
        }
      } catch (err) {
        console.error("[BarcodeScanner] start error:", err);
        if (mountedRef.current) {
          setError(
            typeof err === "string"
              ? err
              : t("scanner.startError")
          );
        }
      }
    };

    startScanning();

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border"
        style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {t("scanner.title")}
          </h3>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" style={{ color: "var(--text-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera selector */}
        {cameras.length > 1 && (
          <div className="px-5 pt-3">
            <select
              value={selectedCamera?.id || ""}
              onChange={(e) => {
                const cam = cameras.find((c) => c.id === e.target.value);
                setSelectedCamera(cam);
              }}
              className="w-full px-3 py-2 rounded-xl border text-sm"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner viewport */}
        <div className="px-5 py-4">
          <div
            id="barcode-scanner-region"
            ref={scannerRef}
            className="rounded-xl overflow-hidden bg-gray-900"
            style={{ minHeight: 260 }}
          />

          {/* Status / error */}
          {error && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          {scanning && !error && (
            <p className="mt-3 text-center text-sm animate-pulse" style={{ color: "var(--text-secondary)" }}>
              {t("scanner.scanning")}
            </p>
          )}
          {!scanning && !error && cameras.length === 0 && (
            <p className="mt-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("scanner.noCameras")}
            </p>
          )}
        </div>

        {/* Tip */}
        <div className="px-5 pb-5">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200">
            <span className="text-teal-600 mt-0.5">💡</span>
            <p className="text-xs text-teal-700">{t("scanner.tip")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
