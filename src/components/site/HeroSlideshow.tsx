import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    url: "/images/priscilla-1.jpeg",
    alt: "Pricilla Mukokobi - Founder of Her Namibia",
    kicker: "HER STORY",
    title: "Every Woman Has a Story Worth Hearing",
    text: "Celebrating the voices and experiences of women across Namibia through meaningful conversations and inspiring stories.",
  },
  {
    url: "/images/priscilla-2.jpeg",
    alt: "Pricilla Mukokobi at Women's Leadership Event",
    kicker: "HER VOICE",
    title: "Amplifying Women's Voices Across Namibia",
    text: "From business leaders to mothers, artists to activists - we share the journeys that shape our nation.",
  },
  {
    url: "/images/priscilla-1.jpeg",
    alt: "Her Namibia Platform",
    kicker: "HER IMPACT",
    title: "Stories That Inspire Future Generations",
    text: "Documenting the resilience, achievements, and lessons of remarkable women to inspire positive change.",
  },
];

const DURATION = 8000;

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  // Slides that have been loaded or primed for preloading
  const [loaded, setLoaded] = useState<number[]>([0, 1]);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    const total = SLIDES.length;
    const target = ((next % total) + total) % total;
    setIndex(target);
    // Preload current, next, and previous slides to ensure smooth crossfade
    const following = (target + 1) % total;
    const previous = (target - 1 + total) % total;
    setLoaded((prev) => {
      const needed = [target, following, previous];
      return needed.every((i) => prev.includes(i))
        ? prev
        : Array.from(new Set([...prev, ...needed]));
    });
  }, []);

  // Continuous 8-second loop that never stops. Restarted cleanly on every
  // index change so the cadence stays consistent across mobile and desktop.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      go(index + 1);
    }, DURATION);
    return () => window.clearTimeout(timer);
  }, [index, go]);

  // Keyboard navigation for accessibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const active = useMemo(() => SLIDES[index] ?? SLIDES[0]!, [index]);

  return (
    <section
      id="home"
      aria-roledescription="carousel"
      aria-label="Her Namibia highlights"
      className="relative isolate min-h-[100svh] w-full overflow-hidden select-none"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        touchStartY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        const startX = touchStartX.current;
        const startY = touchStartY.current;
        const endX = e.changedTouches[0]?.clientX ?? null;
        const endY = e.changedTouches[0]?.clientY ?? null;
        touchStartX.current = null;
        touchStartY.current = null;

        if (startX === null || endX === null || startY === null || endY === null) return;
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        // Ensure horizontal swipe is dominant before changing slides
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          go(index + (deltaX < 0 ? 1 : -1));
        }
      }}
    >
      {SLIDES.map((slide, i) => {
        const isCurrent = i === index;
        const isPrimed = loaded.includes(i);

        return (
          <div
            key={slide.url}
            aria-hidden={!isCurrent}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1200ms] ease-in-out will-change-[opacity]",
              isCurrent ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none",
            )}
          >
            {isPrimed && (
              <img
                src={slide.url}
                alt={slide.alt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "low"}
                draggable={false}
                className={cn(
                  "size-full object-cover object-center transform-gpu",
                  isCurrent && "animate-slow-zoom",
                )}
              />
            )}
            <div className="absolute inset-0 bg-hero-gradient" />
          </div>
        );
      })}

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pt-28 pb-32 sm:pb-28 lg:px-8">
        <div key={index} className="max-w-3xl">
          <span
            className="animate-fade-up block text-[0.65rem] font-bold tracking-[0.25em] text-accent sm:text-xs"
            style={{ animationDelay: "80ms" }}
          >
            {active.kicker}
          </span>
          <h1
            className="animate-fade-up mt-4 text-3xl leading-tight font-extrabold text-primary-foreground sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "180ms" }}
          >
            {active.title}
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-2xl text-sm text-primary-foreground/85 sm:text-lg"
            style={{ animationDelay: "300ms" }}
          >
            {active.text}
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: "420ms" }}
          >
            <a
              href="#stories"
              className="rounded-full bg-accent-gradient px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lift transition-transform duration-300 hover:-translate-y-0.5 sm:px-7"
            >
              Our Stories
            </a>
            <a
              href="#about"
              className="rounded-full border-2 border-primary-foreground/70 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-300 hover:bg-primary-foreground hover:text-primary sm:px-7"
            >
              About Her Namibia
            </a>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Arrows */}
      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
        className="absolute top-1/2 left-3 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/40 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 sm:grid lg:left-6 touch-manipulation"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
        className="absolute top-1/2 right-3 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/40 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 sm:grid lg:right-6 touch-manipulation"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Progress indicators - Responsive & Smooth across mobile & desktop */}
      <div className="absolute bottom-6 left-1/2 z-20 flex w-[min(90%,28rem)] -translate-x-1/2 items-center gap-2.5 sm:bottom-8 sm:gap-3">
        <div className="flex flex-1 items-center gap-2 sm:gap-2.5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.url}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className="group h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground/30 touch-manipulation transition-opacity hover:opacity-80"
            >
              <span
                key={`${i}-${index}`}
                className={cn(
                  "block h-full origin-left rounded-full bg-accent will-change-transform",
                  i === index && "animate-bar",
                  i !== index && "scale-x-0",
                )}
                style={{ animationDuration: `${DURATION}ms` }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
