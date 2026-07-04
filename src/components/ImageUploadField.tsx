import { ChangeEvent, useId, useState } from "react";
import { ImagePlus } from "lucide-react";

type ImageUploadFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fallback?: string;
  aspect?: "square" | "wide" | "portrait";
  outputWidth?: number;
  outputHeight?: number;
};

const aspectClasses = {
  square: "aspect-square",
  wide: "aspect-[16/9]",
  portrait: "aspect-[4/5]",
};

const readImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const cropImageToDataUrl = async (file: File, width: number, height: number) => {
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
  return canvas.toDataURL("image/jpeg", 0.88);
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
  const preview = value || fallback || "";

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng file ảnh.");
      return;
    }

    try {
      setError("");
      const dataUrl = await cropImageToDataUrl(file, outputWidth, outputHeight);
      onChange(dataUrl);
    } catch {
      setError("Chưa xử lý được ảnh này, vui lòng chọn ảnh khác.");
    } finally {
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
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700"
          >
            <ImagePlus className="h-4 w-4" />
            <span>Thay ảnh</span>
          </label>
          <p className="text-xs font-medium text-slate-500">
            Ảnh sẽ tự căn giữa và cắt vừa khung khi lưu.
          </p>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
