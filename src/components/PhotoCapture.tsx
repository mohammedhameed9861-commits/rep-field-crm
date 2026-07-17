import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Check, RotateCcw } from "lucide-react";
import { compressPhoto } from "@/lib/imageCompress";

interface Props {
  label: string;
  onCaptured: (file: File) => void;
}

export function PhotoCapture({ label, onCaptured }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressPhoto(file);
      setPreview(URL.createObjectURL(compressed));
      onCaptured(compressed);
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative block w-full overflow-hidden rounded-xl border border-gray-200"
        >
          <img src={preview} alt={label} className="h-40 w-full object-cover" />
          <span className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">
            <Check className="h-3 w-3" /> {t("photoCapture.captured")}
          </span>
          <span className="absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            <RotateCcw className="h-3 w-3" /> {t("photoCapture.retake")}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 disabled:opacity-50"
        >
          <Camera className="h-5 w-5" /> {compressing ? t("photoCapture.processing") : t("photoCapture.take", { label })}
        </button>
      )}
    </div>
  );
}
