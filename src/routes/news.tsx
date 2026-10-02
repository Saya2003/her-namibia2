import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Filter, Newspaper, ExternalLink, CalendarDays, Maximize2, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/site/ImageLightbox";
import { KEY_SECTORS } from "@/lib/sectors";

const TITLE = "News & Stories | Her Namibia";
const DESCRIPTION = "Stay updated with the latest conversations, features, and inspiring stories from women across Namibia.";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: NewsPage,
});

type NewsArticle = {
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

async function fetchAllPublishedNews(): Promise<NewsArticle[]> {
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

function NewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const { data = [], isLoading } = useQuery({
    queryKey: ["news", "all_published"],
    queryFn: fetchAllPublishedNews,
  });

  const filteredNews = useMemo(() => {
    return data.filter((item) => {
      // Sector filter
      if (selectedSector !== "ALL") {
        const itemSector = (item.sector ?? "Other").trim().toLowerCase();
        const targetSector = selectedSector.trim().toLowerCase();
        if (itemSector !== targetSector) return false;
      }

      // Search term filter
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(term);
        const matchesSummary = (item.summary ?? "").toLowerCase().includes(term);
        const matchesContent = item.content.toLowerCase().includes(term);
        const matchesSector = (item.sector ?? "").toLowerCase().includes(term);
        const matchesCat = (item.category ?? "").toLowerCase().includes(term);
        if (!matchesTitle && !matchesSummary && !matchesContent && !matchesSector && !matchesCat) return false;
      }

      return true;
    });
  }, [data, selectedSector, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSector("ALL");
  };

  const isFiltered = searchTerm !== "" || selectedSector !== "ALL";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="bg-primary py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-5 text-center lg:px-8">
            <Reveal className="mx-auto max-w-3xl">
              <h1 className="text-3xl font-extrabold text-primary-foreground sm:text-4xl lg:text-5xl">
                News & Stories
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/90">
                Stay updated with the latest conversations, features, and inspiring stories 
                from women across Namibia.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Filter and Search Bar Section */}
        <section className="border-b border-border bg-surface py-8">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Search input */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search stories by keyword, title, or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Counter and Clear Filters */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Newspaper className="size-4 text-accent" />
                  {filteredNews.length} {filteredNews.length === 1 ? "Story" : "Stories"} Found
                </span>
                {isFiltered && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="size-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Sector Filter Chips */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="size-3.5 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Filter by Category:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSector("ALL")}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    selectedSector === "ALL"
                      ? "bg-accent text-accent-foreground shadow-sm scale-105"
                      : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
                  }`}
                >
                  All Categories
                </button>
                {KEY_SECTORS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSector(sec)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                      selectedSector === sec
                        ? "bg-accent text-accent-foreground shadow-sm scale-105"
                        : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* News Grid Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
                <Newspaper className="mx-auto size-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-bold text-foreground">No stories found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFiltered
                    ? "Try adjusting your search keywords or category filters."
                    : "No published stories are available at the moment."}
                </p>
                {isFiltered && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-accent-gradient px-6 py-2.5 text-xs font-semibold text-accent-foreground shadow-card"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredNews.map((article, i) => (
                  <Reveal key={article.id} delay={i * 60}>
                    <NewsGridCard article={article} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function NewsGridCard({ article }: { article: NewsArticle }) {
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
                <Maximize2 className="size-4 text-accent" />
                View Fullscreen
              </span>
            </div>
            {article.category && (
              <div className="absolute left-3 top-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-md">
                  {article.category}
                </span>
              </div>
            )}
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
