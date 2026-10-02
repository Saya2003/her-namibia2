import { useState } from "react";
import { CalendarDays, Layers, Maximize2, Images } from "lucide-react";
import { WorkUpdate } from "./RecentWork";
import { ImageLightbox } from "./ImageLightbox";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: WorkUpdate;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = project.image_urls;
  const currentImage = images[activeImageIndex] || images[0];

  const handleOpenLightbox = (index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <article className="hover-lift flex h-full flex-col overflow-hidden rounded-xl border-2 border-primary bg-card shadow-card">
        {/* Main Image Display Area */}
        {currentImage ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted group cursor-pointer" onClick={() => handleOpenLightbox(activeImageIndex)}>
            <img
              src={currentImage}
              alt={`${project.title} - Preview ${activeImageIndex + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
                <Maximize2 className="size-4 text-accent" />
                View Fullscreen
              </span>
            </div>

            {/* Sector Badge */}
            {project.sector && (
              <div className="absolute left-3 top-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-md">
                  <Layers className="size-3.5 text-accent" />
                  {project.sector}
                </span>
              </div>
            )}

            {/* Multi-image indicator badge */}
            {images.length > 1 && (
              <div className="absolute right-3 bottom-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  <Images className="size-3.5 text-accent" />
                  {activeImageIndex + 1} / {images.length}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Thumbnail Selector Strip for Multi-Image Posts */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-surface p-2.5 scrollbar-thin">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={cn(
                  "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all hover:opacity-100",
                  idx === activeImageIndex
                    ? "border-accent ring-2 ring-accent/30 opacity-100 scale-105"
                    : "border-border opacity-65 hover:border-accent/50",
                )}
                title={`Select image ${idx + 1}`}
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

        {/* Card Content */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-accent">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {new Date(project.work_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <h3 className="mt-2.5 text-lg font-bold text-foreground">{project.title}</h3>
          
          <p className="mt-2.5 text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
            {project.description}
          </p>

          {images.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={() => handleOpenLightbox(activeImageIndex)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
              >
                <Maximize2 className="size-3.5" />
                View {images.length > 1 ? `all ${images.length} images` : "image"} fullscreen
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Fullscreen Lightbox Modal */}
      <ImageLightbox
        images={images}
        currentIndex={activeImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setActiveImageIndex}
        title={project.title}
      />
    </>
  );
}
