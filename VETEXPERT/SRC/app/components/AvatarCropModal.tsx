import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";
import { getCroppedImageBlob } from "../../lib/avatarCropCanvas";

type AvatarCropModalProps = {
  imageSrc: string;
  onCancel: () => void;
  /** После сохранения модалку закрывает родитель (до upload). */
  onApply: (blob: Blob) => void | Promise<void>;
};

export default function AvatarCropModal({ imageSrc, onCancel, onApply }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels || busy) return;
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 512);
      await onApply(blob);
    } catch {
      alert("Не удалось обработать аватар — попробуйте другое фото");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2 border-b border-gray-100">
          <h2 id="avatar-crop-title" className="text-lg font-bold text-gray-900">
            Обрезка аватара
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Перетаскивайте фото для кадрирования, ползунком увеличьте или уменьшите.
          </p>
        </div>

        <div className="relative h-[280px] w-full bg-gray-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-3 space-y-2 border-t border-gray-100 bg-gray-50/90">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap w-16 shrink-0">Масштаб</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 accent-emerald-600"
              aria-label="Масштаб"
            />
            <span className="text-xs tabular-nums text-gray-500 w-12 text-right">{zoom.toFixed(2)}×</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-medium text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={busy || !croppedAreaPixels}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 min-w-[8rem]"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Обработка…
                </>
              ) : (
                "Сохранить"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
