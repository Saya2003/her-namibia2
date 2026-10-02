export function packEpisodeMeta(guest: string, duration: string) {
  return [guest.trim(), duration.trim()].filter(Boolean).join("\n");
}

export function unpackEpisodeMeta(summary: string | null | undefined) {
  const [guest = "", duration = ""] = (summary ?? "").split("\n");
  return { guest, duration };
}
