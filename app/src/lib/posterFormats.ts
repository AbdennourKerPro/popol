// Kept apart from poster.ts so the image renderer (and react-dom/server) loads only on demand.
export type Format = 'post' | 'story';
export const FORMATS: Record<Format, { label: string; size: [number, number] }> = {
  post: { label: 'Post 4:5', size: [1080, 1350] },
  story: { label: 'Story 9:16', size: [1080, 1920] },
};
