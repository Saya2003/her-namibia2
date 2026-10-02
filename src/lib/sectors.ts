/** Story themes used across Her Namibia: articles, news, resources, and the podcast. */
export const STORY_CATEGORIES = [
  "Business",
  "Leadership",
  "Health",
  "Motherhood",
  "Culture",
  "Young Women",
  "Other",
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number];

/** Stored in the existing `sector` column. */
export const KEY_SECTORS = STORY_CATEGORIES;

export type SectorType = StoryCategory;

export const RESOURCE_TYPES = [
  "Feature",
  "Interview",
  "Guide",
  "Report",
  "Opinion",
  "Other",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const NEWS_CATEGORIES = STORY_CATEGORIES;

export type NewsCategory = StoryCategory;

/** Episodes are stored in `news` with this category so they stay separate from news posts. */
export const PODCAST_CATEGORY = "Podcast";
