/**
 * Catalog of every community-media slot in the app.
 * Keepers use this to know exact filenames without reading source.
 */
import { SCENES } from "./scenes-data";
import { DAY_ACTS } from "./day-journey-data";
import { LONG_STORIES } from "./long-stories-data";
import type { MediaKind } from "@/lib/media/community-media";

export type MediaSlot = {
  kind: MediaKind;
  id: string;
  title: string;
  /** Public URL path for the community file */
  uploadSrc: string;
  /** Packaged reconstruction path */
  packagedSrc: string;
  /** Practice or film length guidance (seconds) */
  durationSec: number;
  /** App route to open the player */
  playHref: string;
  /** True when content is marked awaiting_upload (stand-in) */
  awaitingUpload: boolean;
  /** Short format tip for keepers */
  tip: string;
};

function sceneHref(id: string) {
  return `/app/scenes/${id}`;
}
function dayHref(id: string) {
  return `/app/day/${id}`;
}
function storyHref(id: string) {
  return `/app/stories/${id}`;
}

export function getMediaCatalog(): MediaSlot[] {
  const scenes: MediaSlot[] = SCENES.map((s) => ({
    kind: "scene" as const,
    id: s.id,
    title: s.title,
    uploadSrc: s.uploadSrc,
    packagedSrc: s.videoSrc,
    durationSec: s.durationSec,
    playHref: sceneHref(s.id),
    awaitingUpload: s.mediaStatus === "awaiting_upload",
    tip: "Short practice · prefer 20–40s MP4 (H.264). Name must match the id.",
  }));

  const day: MediaSlot[] = DAY_ACTS.map((a) => ({
    kind: "day-act" as const,
    id: a.id,
    title: a.title,
    uploadSrc: a.uploadSrc,
    packagedSrc: a.videoSrc,
    durationSec: a.durationSec,
    playHref: dayHref(a.id),
    awaitingUpload: false,
    tip: "Multi-minute act · community footage can be longer; Learn pacing still uses line times.",
  }));

  const stories: MediaSlot[] = LONG_STORIES.map((s) => ({
    kind: "story" as const,
    id: s.id,
    title: s.title,
    uploadSrc: s.uploadSrc,
    packagedSrc: s.videoSrc,
    durationSec: s.durationSec,
    playHref: storyHref(s.id),
    awaitingUpload: false,
    tip: "One continuous film · MP4 H.264 +faststart preferred. Timing lines live in long-stories data.",
  }));

  return [...stories, ...day, ...scenes];
}

export function getMediaCatalogByKind(kind: MediaKind): MediaSlot[] {
  return getMediaCatalog().filter((s) => s.kind === kind);
}

export function getAwaitingUploadSlots(): MediaSlot[] {
  return getMediaCatalog().filter((s) => s.awaitingUpload);
}

export const MEDIA_UPLOAD_DIRS = {
  scene: "/scenes/uploads/{id}.mp4",
  "day-act": "/scenes/day/uploads/{id}.mp4",
  story: "/scenes/long/uploads/{id}.mp4",
} as const;

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  scene: "Scenes (short practice)",
  "day-act": "Full Day acts",
  story: "Stories (continuous film)",
};
