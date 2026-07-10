/**
 * Persistent preview artifacts are disabled until the Arc refresh failure can
 * be reproduced and validated outside a user's browser profile. In-memory
 * caches still make rerenders within one page session fast.
 */
export const PREVIEW_CACHE_STORAGE = "memory" as const;
