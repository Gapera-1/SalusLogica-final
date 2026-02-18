import React, { useRef, useState } from "react";
import { useLanguage } from "../i18n";

/**
 * Medicine photo capture & preview component.
 *
 * Props:
 *   photo         – current File or URL string (preview)
 *   onPhotoChange – called with the selected File object
 *   onRemove      – called to clear the photo
 */
const MedicinePhotoCapture = ({ photo, onPhotoChange, onRemove }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (file) => {
    if (!file) return;

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(file.type)) {
      alert(t("medicinePhoto.invalidType"));
      return;
    }
    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(t("medicinePhoto.tooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    onPhotoChange(file);
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRemove?.();
  };

  // Determine what to show as the image preview
  const previewUrl =
    preview ||
    (typeof photo === "string" && photo) ||
    null;

  return (
    <div className="space-y-2">
      <label
        className="text-sm font-medium flex items-center gap-1"
        style={{ color: "var(--text-primary, #374151)" }}
      >
        📷 {t("medicinePhoto.label")}
      </label>

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Medicine"
            className="h-32 w-32 object-cover rounded-xl border-2 border-teal-300 shadow-sm"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
            title={t("medicinePhoto.remove")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Camera capture (mobile) */}
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.capture = "environment"; // rear camera
              input.onchange = (e) => handleFile(e.target.files?.[0]);
              input.click();
            }}
            className="flex-1 flex flex-col items-center gap-1.5 px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer"
          >
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium text-gray-500">
              {t("medicinePhoto.takePhoto")}
            </span>
          </button>

          {/* Gallery / file picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-1.5 px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer"
          >
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-500">
              {t("medicinePhoto.fromGallery")}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-secondary, #6b7280)" }}>
        {t("medicinePhoto.hint")}
      </p>
    </div>
  );
};

export default MedicinePhotoCapture;
