import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, RotateCcw } from "lucide-react";

/** A live-camera-only photo capture — no gallery/file picker at all, on desktop or
 * mobile. Uses getUserMedia + a canvas snapshot rather than a plain file input,
 * since browsers only honor <input capture> as a hint on some mobile devices and
 * ignore it entirely on desktop (where a plain file input just opens the OS picker). */
export default function CameraCapture({
  onCapture,
  captured,
}: {
  onCapture: (file: File | null) => void;
  /** Pass the currently-captured file (if any) so the parent form can reset it. */
  captured: File | null;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  // A real state value, not a ref — the <video> tag only exists in the JSX once this flips
  // to non-null, so attaching the stream has to happen in an effect *after* that mount, not
  // inline in startCamera() (which used to write to a ref, never triggering that re-render,
  // so the srcObject assignment ran against a still-null videoRef and the video stayed black).
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play();
    }
  }, [stream]);

  function stopStream() {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }

  async function startCamera() {
    setError(null);
    setStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(s);
    } catch {
      setError(t("camera.denied"));
    } finally {
      setStarting(false);
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `visit-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreviewUrl(URL.createObjectURL(blob));
        onCapture(file);
        stopStream();
      },
      "image/jpeg",
      0.85,
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onCapture(null);
    void startCamera();
  }

  if (captured && previewUrl) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img src={previewUrl} alt="" className="h-48 w-full rounded-xl object-cover" />
        <button
          type="button"
          onClick={retake}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw size={13} /> {t("camera.retake")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4">
      {stream ? (
        <>
          <video ref={videoRef} playsInline muted className="h-48 w-full rounded-lg bg-black object-cover" />
          <button
            type="button"
            onClick={takePhoto}
            className="flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Camera size={16} /> {t("camera.takePhoto")}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={starting}
          className="flex flex-col items-center gap-2 py-4 text-sm text-gray-500 hover:text-teal-600 disabled:opacity-50"
        >
          <Camera size={22} />
          {starting ? t("common.loading") : t("camera.open")}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
