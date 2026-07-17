import { Loader2 } from "lucide-react";

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
