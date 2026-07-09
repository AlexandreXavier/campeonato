import { makeFunctionReference } from "convex/server";

export const portalApi = {
  getPublicPortal: makeFunctionReference<"query">("portal:getPublicPortal"),
  getAdminDashboard: makeFunctionReference<"query">(
    "portal:getAdminDashboard",
  ),
  syncCurrentUser: makeFunctionReference<"mutation">(
    "portal:syncCurrentUser",
  ),
  upsertSiteSettings: makeFunctionReference<"mutation">(
    "portal:upsertSiteSettings",
  ),
  saveNotice: makeFunctionReference<"mutation">("portal:saveNotice"),
  generateNoticeUploadUrl: makeFunctionReference<"mutation">(
    "portal:generateNoticeUploadUrl",
  ),
  saveScheduleItem: makeFunctionReference<"mutation">(
    "portal:saveScheduleItem",
  ),
  saveNewsPost: makeFunctionReference<"mutation">("portal:saveNewsPost"),
  saveMediaItem: makeFunctionReference<"mutation">("portal:saveMediaItem"),
  saveResultSnapshot: makeFunctionReference<"mutation">(
    "portal:saveResultSnapshot",
  ),
  saveTrackingDemo: makeFunctionReference<"mutation">(
    "portal:saveTrackingDemo",
  ),
  setUserRole: makeFunctionReference<"mutation">("portal:setUserRole"),
  importCompetitionBoats: makeFunctionReference<"mutation">(
    "imports:importCompetitionBoats",
  ),
  generateDemoRace: makeFunctionReference<"mutation">("imports:generateDemoRace"),
  syncEntriesFromBoats: makeFunctionReference<"mutation">(
    "imports:syncEntriesFromBoats",
  ),
};
