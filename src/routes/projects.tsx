import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Filter, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { ProjectCard } from "@/components/site/ProjectCard";
import { WorkUpdate } from "@/components/site/RecentWork";
import { KEY_SECTORS } from "@/lib/sectors";

const TITLE = "Articles | Her Namibia";
const DESCRIPTION =
  "Read articles and reported stories about remarkable women from across Namibia.";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ProjectsPage,
});

async function fetchAllPublishedWork(): Promise<WorkUpdate[]> {
  const { data, error } = await supabase
    .from("work_updates")
    .select("id,title,description,image_urls,work_date,status,sector")
    .eq("status", "published")
    .order("work_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    image_urls: Array.isArray(row.image_urls) ? (row.image_urls as string[]) : [],
  }));
}

function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const { data = [], isLoading } = useQuery({
    queryKey: ["work_updates", "all_published"],
    queryFn: fetchAllPublishedWork,
  });

  // Filter projects by search term and sector
  const filteredProjects = useMemo(() => {
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
        const matchesDesc = item.description.toLowerCase().includes(term);
        const matchesSector = (item.sector ?? "").toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesSector) return false;
      }

      return true;
    });
  }, [data, selectedSector, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSector("ALL");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="bg-primary py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-5 text-center lg:px-8">
            <Reveal className="mx-auto max-w-3xl">
              <h1 className="text-3xl font-extrabold text-primary-foreground sm:text-4xl lg:text-5xl">
                Articles
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/90">
                Read articles and reported stories about remarkable women from across Namibia.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Filter and Search Bar Section */}
        <section className="border-b border-border bg-surface py-8">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Bar */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles by title, keyword, or category..."
                  className="w-full rounded-full border border-input bg-card pl-10 pr-10 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Active Filter Counter */}
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <FolderKanban className="size-4 text-accent" />
                  {filteredProjects.length} {filteredProjects.length === 1 ? "Article" : "Articles"} Found
                </span>
                {(selectedSector !== "ALL" || searchTerm) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <X className="size-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Key Operating Sectors Filter Chips */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="size-3.5 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Filter by Category
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSector("ALL")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    selectedSector === "ALL"
                      ? "bg-accent text-accent-foreground shadow-sm scale-105"
                      : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
                  }`}
                >
                  All Categories
                </button>
                {KEY_SECTORS.map((sector) => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                      selectedSector === sector
                        ? "bg-accent text-accent-foreground shadow-sm scale-105"
                        : "border border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground"
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Grid Section */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-16 text-center shadow-card max-w-xl mx-auto">
                <FolderKanban className="mx-auto size-12 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-bold text-foreground">No projects found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  No articles match your current search or category.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-full bg-accent-gradient px-6 py-2.5 text-xs font-semibold text-accent-foreground shadow-sm hover:shadow-card"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project, i) => (
                  <Reveal key={project.id} delay={i * 60}>
                    <ProjectCard project={project} />
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
