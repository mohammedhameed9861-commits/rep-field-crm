import imageCompression from "browser-image-compression";

// Reps are outdoors on weak mobile data — keep uploads small.
export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.75,
  });
}
