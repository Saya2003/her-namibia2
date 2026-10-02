import type React from "react";

export const SITE_NAME = "Her Namibia";
export const CANONICAL_DOMAIN = "https://www.hernamibia.com";

export const DEFAULT_TITLE = `Her Namibia | Celebrating Women's Stories & Voices – Windhoek, Namibia`;
export const DEFAULT_DESCRIPTION =
  "Her Namibia is a platform celebrating women in Namibia through meaningful conversations and inspiring stories. Discover journeys of leadership, motherhood, business, health, and personal growth across all walks of life.";
export const HOME_DESCRIPTION =
  "Her Namibia celebrates women's voices through honest conversations highlighting journeys, challenges, achievements, and lessons to inspire positive change. Founded by Pricilla Mukokobi, we share stories from business, leadership, motherhood, health, culture, and young women making a difference in Namibia.";

export const KEYWORDS =
  "Her Namibia, women Namibia, Pricilla Mukokobi, women's stories Namibia, women leadership Namibia, motherhood Namibia, women in business Namibia, women empowerment Namibia, Namibian women podcast, women's voices Africa, female entrepreneurs Namibia, women's health Namibia, women culture Namibia, inspiring women stories, women success stories Namibia, Windhoek women, African women platform, women conversations Namibia, female leadership Africa, women achievements Namibia, women's experiences Namibia, celebrating women Namibia, women role models Namibia, female professionals Namibia";

export const OG_IMAGE = "/images/priscilla-1.jpeg";
export const OG_IMAGE_ALT = "Her Namibia – Celebrating Women's Stories and Voices in Namibia";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const SITE_CONTACT = {
  telephone: "+264 81 361 8370",
  email: "priscillamukokobi@gmail.com",
  streetAddress: "Windhoek, Namibia",
  addressLocality: "Windhoek",
  addressRegion: "Khomas",
  addressCountry: "NA",
  geo: { latitude: -22.5609, longitude: 17.0898 },
};

export const SOCIAL_LINKEDIN = "https://www.linkedin.com/in/priscilla-mukokobi/";

/**
 * Returns the canonical site URL.
 * Priority: env SITE_URL → env VITE_SITE_URL → Netlify URL env → hardcoded production domain.
 */
export function siteUrl(): string {
  const env =
    ((import.meta.env as Record<string, string>)["SITE_URL"] ?? "") ||
    ((import.meta.env as Record<string, string>)["VITE_SITE_URL"] ?? "") ||
    ((import.meta.env as Record<string, string>)["URL"] ?? "");
  // Fall back to the production canonical domain so canonical tags are always emitted.
  const resolved = env.trim().replace(/\/+$/, "") || CANONICAL_DOMAIN;
  return resolved;
}

export function absolutize(path: string): string {
  const base = siteUrl();
  if (!base) return path;
  return /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type SeoOptions = {
  title?: string;
  description?: string;
  keywords?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  canonical?: boolean;
  noindex?: boolean;
  nofollow?: boolean;
};

export function seo(options: SeoOptions = {}) {
  const title = options.title ?? DEFAULT_TITLE;
  const description = options.description ?? DEFAULT_DESCRIPTION;
  const emitUrl = options.canonical !== false;
  const absoluteUrl = emitUrl ? absolutize(options.path ?? "/") : undefined;
  const robots =
    options.noindex || options.nofollow
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  const meta: React.JSX.IntrinsicElements["meta"][] = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: options.keywords ?? KEYWORDS },
    { name: "author", content: SITE_NAME },
    { name: "application-name", content: SITE_NAME },
    { name: "robots", content: robots },
    { name: "googlebot", content: robots },
    { name: "theme-color", content: "#0b3954" },
    // Open Graph
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "en_ZA" },
    { property: "og:locale:alternate", content: "en_US" },
    ...(absoluteUrl ? [{ property: "og:url", content: absoluteUrl }] : []),
    { property: "og:image", content: absolutize(options.image ?? OG_IMAGE) },
    { property: "og:image:alt", content: options.imageAlt ?? OG_IMAGE_ALT },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:type", content: "image/jpeg" },
    // Twitter / X card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: absolutize(options.image ?? OG_IMAGE) },
    { name: "twitter:image:alt", content: options.imageAlt ?? OG_IMAGE_ALT },
  ];

  const links: React.JSX.IntrinsicElements["link"][] = [
    ...(absoluteUrl ? [{ rel: "canonical", href: absoluteUrl }] : []),
    { rel: "alternate", hrefLang: "en", href: absolutize(options.path ?? "/") },
  ];

  return { meta, links };
}

