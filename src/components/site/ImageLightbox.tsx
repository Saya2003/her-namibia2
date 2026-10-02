import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  title?: string;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  title,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    const nextIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scrolling when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image fullscreen viewer"
    >
      {/* Top Controls Bar */}
      <div
        className="flex shrink-0 items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Maximize2 className="size-5 text-accent" />
          {title && <span className="max-w-xs truncate text-sm font-semibold sm:max-w-md">{title}</span>}
          {images.length > 1 && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {currentIndex + 1} of {images.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Close fullscreen view"
        >
          <X className="size-6" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative flex flex-1 items-center justify-center p-4 sm:p-8 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 z-10 grid size-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent sm:left-8"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-7" />
          </button>
        )}

        {/* Fullscreen Displayed Image */}
        <img
          src={currentImage}
          alt={title ? `${title} - Image ${currentIndex + 1}` : `Fullscreen image ${currentIndex + 1}`}
          className="max-h-[78vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
        />

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 z-10 grid size-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent sm:right-8"
            aria-label="Next image"
          >
            <ChevronRight className="size-7" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {images.length > 1 && (
        <div
          className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto p-4 bg-gradient-to-t from-black/80 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigate(idx)}
              className={cn(
                "relative h-14 w-20 overflow-hidden rounded-md border-2 transition-all shrink-0",
                idx === currentIndex
                  ? "border-accent scale-105 opacity-100 ring-2 ring-accent"
                  : "border-transparent opacity-50 hover:opacity-90",
              )}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
