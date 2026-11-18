import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Image as ImageIcon, Loader2, Play, RefreshCw, Upload, XCircle } from 'lucide-react';
import type { TypingSessionResult } from '../types/typing';
import { TypingEngine } from './TypingEngine';

interface ScanAndTypeViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  inactivityPauseSeconds: number;
  isExternallyPaused: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
}

/**
 * Downscales oversized mobile/camera photos to <= 1600px JPEG on a canvas
 * so OCR uploads fast and never triggers payload-size errors while keeping text crisp.
 */
async function prepareImageForOcr(fileOrDataUrl: File | string): Promise<{ dataUrl: string; mimeType: string }> {
  const rawDataUrl =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Could not read the selected image file.'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: rawDataUrl, mimeType: 'image/jpeg' });
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.88);
      resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      resolve({ dataUrl: rawDataUrl, mimeType: 'image/jpeg' });
    };
    img.src = rawDataUrl;
  });
}

export const ScanAndTypeView: React.FC<ScanAndTypeViewProps> = ({
  soundEnabled,
  onToggleSound,
  inactivityPauseSeconds,
  isExternallyPaused,
  zenFocusMode,
  onSessionComplete,
}) => {
  const [step, setStep] = useState<'capture' | 'edit' | 'typing'>('capture');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [extractedText, setExtractedText] = useState<string>('');
  const [detectedType, setDetectedType] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera & abort state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      abortControllerRef.current?.abort();
    };
  }, []);

  const runOcr = async (base64DataUrl: string, mimeType: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType,
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let data: { text?: string; detectedType?: string; error?: string } = {};
      try {
        data = JSON.parse(rawBody);
      } catch {
        throw new Error(
          response.status === 413
            ? 'Your image file is too large. Please try a smaller photo.'
            : 'The scan service had trouble reading that response. Please try again.'
        );
      }

      if (!response.ok || !data.text) {
        throw new Error(
          data.error || 'No readable text was found in this image. Please try a clearer, brighter photo.'
        );
      }

      setExtractedText(data.text);
      setDetectedType(data.detectedType || 'notebook');
      setStep('edit');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not read text from this image. Please try another photo or enter text manually.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file type. Please upload an image file (JPG, PNG, or WebP).');
      return;
    }

    stopCamera();
    setErrorMessage(null);
    try {
      const prepared = await prepareImageForOcr(file);
      setImagePreviewUrl(prepared.dataUrl);
      setImageMimeType(prepared.mimeType);
      await runOcr(prepared.dataUrl, prepared.mimeType);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to open the selected image. Please try another file.'
      );
    }
  };

  // Support pasting an image directly from clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== 'capture' || isScanning) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelected(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera capture.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setErrorMessage(
        'Camera permission was denied or no camera was detected. Please use the "Upload Image" option instead.'
      );
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    const prepared = await prepareImageForOcr(dataUrl);
    setImagePreviewUrl(prepared.dataUrl);
    setImageMimeType(prepared.mimeType);
    await runOcr(prepared.dataUrl, prepared.mimeType);
  };

  const resetAll = () => {
    stopCamera();
    setStep('capture');
    setImagePreviewUrl(null);
    setExtractedText('');
    setDetectedType('');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (step === 'typing') {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {!zenFocusMode && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('edit')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              &larr; Edit Scanned Paragraph
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Scan Another Image
            </button>
          </div>
        )}

        <TypingEngine
          title="Scan & Type Practice"
          subtitle={`Extracted from ${detectedType || 'notebook'} image · ${extractedText.length} characters`}
          text={extractedText}
          mode="scan"
          showKeyboardDefault={true}
          showHandsDefault={false}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          inactivityPauseSeconds={inactivityPauseSeconds}
          isExternallyPaused={isExternallyPaused}
          zenFocusMode={zenFocusMode}
          onSessionComplete={onSessionComplete}
          onNext={resetAll}
          nextLabel="Scan New Image"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Scan &amp; Type from Notebook</h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload a photo of printed or handwritten notes (or capture using your camera), review the extracted text, and turn it into a typing exercise.
            </p>
          </div>
          {(step === 'edit' || imagePreviewUrl) && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Choose Another Image
            </button>
          )}
        </div>

        {/* User-friendly Error Banner with Recovery Actions */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-semibold">Could not complete scan</div>
                <p className="text-rose-800 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {imagePreviewUrl && (
                <button
                  type="button"
                  onClick={() => runOcr(imagePreviewUrl, imageMimeType)}
                  disabled={isScanning}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                >
                  Retry Scan
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep('edit');
                }}
                className="px-3 py-1.5 text-xs font-medium text-rose-900 bg-white border border-rose-200 hover:bg-rose-100 rounded-lg cursor-pointer"
              >
                Type / Paste Text Manually
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="mt-6 space-y-6">
            {isScanning ? (
              <div className="py-10 px-6 flex flex-col items-center justify-center text-center border border-indigo-200 rounded-xl bg-indigo-50/40">
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Uploaded preview being scanned"
                    referrerPolicy="no-referrer"
                    className="h-36 w-auto rounded-lg border border-slate-200 object-contain mb-4 bg-white"
                  />
                )}
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <div className="text-base font-semibold text-slate-900 mt-3">
                  Reading text from your image...
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Extracting printed or handwritten words cleanly. Please wait a moment.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    abortControllerRef.current?.abort();
                    setIsScanning(false);
                    setStep('edit');
                  }}
                  className="mt-4 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel &amp; Type Text Manually
                </button>
              </div>
            ) : cameraActive ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video max-h-[420px] mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo &amp; Extract Text
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upload Image Card */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelected(e.dataTransfer.files?.[0]);
                  }}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-indigo-50/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 mt-4">
                    Upload Image
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 max-w-xs">
                    Select a notebook photo, drag &amp; drop here, or paste an image with Ctrl+V. Supports handwritten and printed pages.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload Image
                  </button>
                </div>

                {/* Camera Capture Card */}
                <div className="border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 mt-4">
                    Capture with Camera
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 max-w-xs">
                    Point your webcam or phone camera at your notebook page and capture a clear photo to scan.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'edit' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {imagePreviewUrl && (
              <div className="lg:col-span-5 flex flex-col">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  Uploaded Image ({detectedType || 'Scanned'})
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex-1 flex items-center justify-center max-h-80">
                  <img
                    src={imagePreviewUrl}
                    alt="Uploaded notebook page for OCR"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className={`${imagePreviewUrl ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor="ocr-text-editor" className="text-xs font-medium text-slate-700 inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Extracted Paragraph (Edit or paste text before typing)
                </label>
                <span className="text-xs text-slate-500 tabular-nums">
                  {extractedText.trim().split(/\s+/).filter(Boolean).length} words · {extractedText.length} chars
                </span>
              </div>

              <textarea
                id="ocr-text-editor"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={9}
                className="w-full flex-1 font-mono text-sm leading-relaxed p-4 rounded-xl border border-slate-300 focus:border-indigo-600 focus:outline-none bg-slate-50 text-slate-900"
                placeholder="Extracted text appears here — you can also edit or paste any paragraph manually..."
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {imagePreviewUrl && (
                  <button
                    type="button"
                    onClick={() => runOcr(imagePreviewUrl, imageMimeType)}
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    Re-run OCR
                  </button>
                )}

                <button
                  type="button"
                  disabled={!extractedText.trim()}
                  onClick={() => setStep('typing')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                >
                  <Play className="w-4 h-4" />
                  Start Typing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
