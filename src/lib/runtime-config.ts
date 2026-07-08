export const EVENT_SLUG = "campeonato-portugal-orc-2026";

export const hasConvexConfig = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.NEXT_PUBLIC_CONVEX_URL.startsWith("https://"),
);

export const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://example.convex.cloud";

export const defaultMapStyleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "";
