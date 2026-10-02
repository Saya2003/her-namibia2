import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ExternalLink, Newspaper, Maximize2, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "./Reveal";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "./ImageLightbox";

export type NewsArticle = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  news_date: string;
  sector?: string | null;
  category?: string | null;
  image_urls: string[];
  external_link?: string | null;
  status: string;
};

async function fetchPublishedNews(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news")
    .select("id,title,summary,content,news_date,sector,category,image_urls,external_link,status")
    .eq("status", "published")
    .order("news_date", { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      ...row,
      image_urls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
    }))
    .filter((row) => row.category !== "Podcast") as NewsArticle[];
}

export function RecentNews() {
  const { data, isLoading } = useQuery({
    queryKey: ["news", "published"],
    queryFn: fetchPublishedNews,
  });

  const allItems = data ?? [];
  const latestItems = allItems.slice(0, 3);

  return (
    <section id="news" className="scroll-mt-24 bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.2em] text-accent">MEDIA & ANNOUNCEMENTS</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">News & Updates</h2>
        </Reveal>

        {isLoading ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : latestItems.length === 0 ? (
          <Reveal className="mt-12 rounded-xl border-2 border-dashed border-primary bg-card p-12 text-center">
            <Newspaper className="mx-auto size-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              News and updates will be published here soon.
            </p>
          </Reveal>
        ) : (
          <>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestItems.map((article, i) => (
                <Reveal key={article.id} delay={i * 90}>
                  <NewsCard article={article} />
                </Reveal>
              ))}
            </div>

            {/* View All News Button */}
            <div className="mt-12 text-center">
              <a
                href="/news"
                className="inline-flex items-center gap-2 rounded-full bg-accent-gradient px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                View all news ({allItems.length})
                <ArrowRight className="size-4" />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = article.image_urls;
  const currentImage = images[activeImageIndex] || images[0];

  const handleOpenLightbox = (index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <article className="hover-lift flex h-full flex-col overflow-hidden rounded-xl border-2 border-primary bg-card shadow-card">
        {/* Article Image Preview */}
        {currentImage && (
          <div
            className="relative aspect-[16/10] w-full overflow-hidden bg-muted group cursor-pointer"
            onClick={() => handleOpenLightbox(activeImageIndex)}
          >
            <img
              src={currentImage}
              alt={article.title}
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

            {/* Category badge */}
            {article.category && (
              <div className="absolute left-3 top-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-md">
                  {article.category}
                </span>
              </div>
            )}

            {/* Image counter if multiple */}
            {images.length > 1 && (
              <div className="absolute right-3 bottom-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  <Images className="size-3.5 text-accent" />
                  {activeImageIndex + 1} / {images.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Card Content */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-accent">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {new Date(article.news_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {article.sector && (
              <Badge variant="outline" className="text-[11px]">
                {article.sector}
              </Badge>
            )}
          </div>

          <h3 className="mt-2.5 text-lg font-bold text-foreground leading-snug">{article.title}</h3>

          <p className="mt-2.5 text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
            {article.summary || article.content}
          </p>

          {article.external_link && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <a
                href={article.external_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Read Full Story / External Source
              </a>
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
        title={article.title}
      />
    </>
  );
}
