import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Download, ExternalLink, FileText, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "./Reveal";
import { Badge } from "@/components/ui/badge";

export type Resource = {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  sector?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  author?: string | null;
  publication_date: string;
  status: string;
};

async function fetchPublishedResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("id,title,description,resource_type,sector,file_url,external_url,author,publication_date,status")
    .eq("status", "published")
    .order("publication_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Resource[];
}

export function RecentResources() {
  const { data, isLoading } = useQuery({
    queryKey: ["resources", "published"],
    queryFn: fetchPublishedResources,
  });

  const allItems = data ?? [];
  const latestItems = allItems.slice(0, 3);

  return (
    <section id="resources" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.2em] text-accent">KNOWLEDGE & ADVISORY</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Resources & Publications</h2>
        </Reveal>

        {isLoading ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : latestItems.length === 0 ? (
          <Reveal className="mt-12 rounded-xl border-2 border-dashed border-primary bg-card p-12 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              New policy briefs, toolkits, and research reports will be published here soon.
            </p>
          </Reveal>
        ) : (
          <>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestItems.map((item, i) => (
                <Reveal key={item.id} delay={i * 90} as="article">
                  <article className="hover-lift flex h-full flex-col justify-between overflow-hidden rounded-xl border-2 border-primary bg-card p-6 shadow-card">
                    <div>
                      {/* Top Row: Date & Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                          <CalendarDays className="size-3.5" />
                          {new Date(item.publication_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="default" className="text-[11px] bg-accent text-accent-foreground">
                            {item.resource_type}
                          </Badge>
                          {item.sector && (
                            <Badge variant="outline" className="text-[11px]">
                              {item.sector}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3.5 text-lg font-bold text-foreground leading-snug">{item.title}</h3>

                      {/* Author */}
                      {item.author && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <User className="size-3.5 text-accent" />
                          {item.author}
                        </p>
                      )}

                      {/* Description */}
                      <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Actions (Download / Link) */}
                    {(item.file_url || item.external_url) && (
                      <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-4">
                        {item.file_url && (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                          >
                            <Download className="size-3.5" />
                            Download Document
                          </a>
                        )}
                        {item.external_url && (
                          <a
                            href={item.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                          >
                            <ExternalLink className="size-3.5" />
                            External Source
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>

            {/* View All Resources Button */}
            <div className="mt-12 text-center">
              <a
                href="/resources"
                className="inline-flex items-center gap-2 rounded-full bg-accent-gradient px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                View all resources ({allItems.length})
                <ArrowRight className="size-4" />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
