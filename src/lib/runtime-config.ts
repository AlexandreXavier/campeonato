export const EVENT_SLUG = "campeonato-portugal-orc-2026";

export const hasConvexConfig = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.NEXT_PUBLIC_CONVEX_URL !== "https://example.convex.cloud",
);

export const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export const hasLocalAdminConfig =
  process.env.NEXT_PUBLIC_LOCAL_ADMIN === "true";

export const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://example.convex.cloud";

export const mapboxAccessToken =
  process.env.NEXT_PUBLIC_MAPBOX_API_KEY ?? "";

export const mapboxStyleId =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE_ID ??
  "portocarodos/ckwfc60jr043014lg0e7kdrfm";

export const mapboxStyleUrl =
  mapboxAccessToken && mapboxStyleId
    ? `https://api.mapbox.com/styles/v1/${mapboxStyleId}?access_token=${mapboxAccessToken}`
    : "";

export const defaultMapStyleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || mapboxStyleUrl || "";
