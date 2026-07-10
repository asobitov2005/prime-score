export const MAX_CUSTOM_TASK_IMAGE_BYTES = 10 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export function getImageFromFileList(
  files: FileList | File[],
): File | null {
  return (
    Array.from(files).find((file) => file.type.startsWith("image/")) ?? null
  );
}
