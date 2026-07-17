import { useEffect, useState } from "react";
import { getSignedPhotoUrl } from "@/lib/storage";

export function PhotoThumb({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedPhotoUrl(path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return <div className={`animate-pulse bg-gray-200 ${className ?? "h-24 w-full"}`} />;
  }
  return <img src={url} alt={alt} className={`object-cover ${className ?? "h-24 w-full"}`} />;
}
