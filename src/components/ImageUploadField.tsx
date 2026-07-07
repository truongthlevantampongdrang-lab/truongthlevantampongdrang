import { ChangeEvent, useId, useState } from "react";
import { ImagePlus } from "lucide-react";

const COMPRESSED_IMAGE_TYPE = "image/webp";
const FALLBACK_IMAGE_TYPE = "image/jpeg";
const COMPRESSED_IMAGE_QUALITY = 0.72;
const MAX_INPUT_IMAGE_SIZE = 12 * 1024 * 1024;

type ImageUploadFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fallback?: string;
  aspect?: "square" | "wide" | "portrait";
  outputWidth?: number;
  outputHeight?: number;
};

type ProcessedImage = {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
};

const aspectClasses = {
  square: "aspect-square",
  wide: "aspect-[16/9]",
  portrait: "aspect-[4/5]",
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

const readImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  });

const cropImageToDataUrl = async (file: File, width: number, height: number): Promise<ProcessedImage> => {
  const image = await readImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Cannot process image");
  }

  canvas.width = width;
  canvas.height = height;

  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, COMPRESSED_IMAGE_TYPE, COMPRESSED_IMAGE_QUALITY);
  const blob =
    webpBlob?.type === COMPRESSED_IMAGE_TYPE
      ? webpBlob
      : await canvasToBlob(canvas, FALLBACK_IMAGE_TYPE, COMPRESSED_IMAGE_QUALITY);

  if (!blob) {
    throw new Error("Cannot compress image");
  }

  return {
    dataUrl: await blobToDataUrl(blob),
    originalSize: file.size,
    compressedSize: blob.size,
  };
};

export default function ImageUploadField({
  label,
  value,
  onChange,
  fallback,
  aspect = "wide",
  outputWidth = 900,
  outputHeight = 506,
}: ImageUploadFieldProps) {
  const id = useId();
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState("");
  const preview = value || fallback || "";

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng file ảnh.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_INPUT_IMAGE_SIZE) {
      setError(`Ảnh quá lớn (${formatBytes(file.size)}). Vui lòng chọn ảnh tối đa ${formatBytes(MAX_INPUT_IMAGE_SIZE)}.`);
      event.target.value = "";
      return;
    }

    try {
      setError("");
      setCompressionInfo("");
      setIsProcessing(true);
      const processed = await cropImageToDataUrl(file, outputWidth, outputHeight);
      onChange(processed.dataUrl);
      setCompressionInfo(`Đã giảm từ ${formatBytes(processed.originalSize)} xuống ${formatBytes(processed.compressedSize)}.`);
    } catch {
      setError("Chưa xử lý được ảnh này, vui lòng chọn ảnh khác.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${aspectClasses[aspect]}`}>
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
              Chưa có ảnh
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input id={id} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <label
            htmlFor={id}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all ${
              isProcessing ? "cursor-wait bg-slate-400" : "cursor-pointer bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <ImagePlus className="h-4 w-4" />
            <span>{isProcessing ? "Đang nén ảnh..." : "Thay ảnh"}</span>
          </label>
          <p className="text-xs font-medium text-slate-500">
            Ảnh sẽ tự căn giữa, cắt vừa khung và nén nhẹ trước khi lưu.
          </p>
          {compressionInfo && <p className="text-xs font-semibold text-emerald-700">{compressionInfo}</p>}
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
