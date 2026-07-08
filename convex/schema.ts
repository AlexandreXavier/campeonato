import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const auditFields = {
  createdAt: v.optional(v.float64()),
  updatedAt: v.optional(v.float64()),
  createdBy: v.optional(v.id("users")),
  updatedBy: v.optional(v.id("users")),
};

export default defineSchema({
  boatClasses: defineTable({
    code: v.string(),
    name: v.string(),
    oneDesign: v.boolean(),
  }).index("by_code", ["code"]),
  boats: defineTable({
    certificateId: v.optional(v.id("orcCertificates")),
    classCode: v.string(),
    clubId: v.optional(v.id("clubs")),
    name: v.string(),
    ownerUserId: v.id("users"),
    sailNumber: v.string(),
  })
    .index("by_classCode", ["classCode"])
    .index("by_club", ["clubId"])
    .index("by_owner", ["ownerUserId"]),
  clubs: defineTable({
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactWebsite: v.optional(v.string()),
    isOwner: v.boolean(),
    logoStorageId: v.optional(v.id("_storage")),
    name: v.string(),
    region: v.optional(v.string()),
    shortName: v.optional(v.string()),
  })
    .index("by_isOwner", ["isOwner"])
    .index("by_name", ["name"]),
  entries: defineTable({
    boatName: v.string(),
    certificateId: v.optional(v.id("orcCertificates")),
    classCode: v.string(),
    clubId: v.optional(v.id("clubs")),
    crew: v.optional(v.array(v.string())),
    fleetId: v.id("fleets"),
    owner: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    photoUrl: v.optional(v.string()),
    sailNumber: v.string(),
    skipper: v.string(),
    status: v.union(
      v.literal("pendente"),
      v.literal("aprovada"),
      v.literal("rejeitada"),
    ),
  })
    .index("by_classCode", ["classCode"])
    .index("by_club", ["clubId"])
    .index("by_fleet", ["fleetId"])
    .index("by_fleet_status", ["fleetId", "status"])
    .index("by_owner", ["ownerUserId"])
    .searchIndex("search_boat", {
      searchField: "boatName",
      filterFields: ["status"],
    }),
  fleets: defineTable({
    classCodes: v.array(v.string()),
    discards: v.float64(),
    name: v.string(),
    regattaId: v.id("regattas"),
    scoringMethod: v.union(
      v.literal("orc-tot"),
      v.literal("orc-tod"),
      v.literal("one-design"),
    ),
  }).index("by_regatta", ["regattaId"]),
  notices: defineTable({
    body: v.string(),
    regattaId: v.id("regattas"),
    title: v.string(),
    category: v.optional(
      v.union(
        v.literal("anuncio"),
        v.literal("instrucoes"),
        v.literal("aviso"),
        v.literal("alteracao"),
        v.literal("protesto"),
        v.literal("decisao"),
        v.literal("resultado"),
        v.literal("comite"),
      ),
    ),
    priority: v.optional(
      v.union(v.literal("normal"), v.literal("importante"), v.literal("urgente")),
    ),
    publishedAt: v.optional(v.string()),
    attachmentName: v.optional(v.string()),
    attachmentStorageId: v.optional(v.id("_storage")),
    ...auditFields,
  }).index("by_regatta", ["regattaId"]),
  orcCertificates: defineTable({
    aphT: v.optional(v.float64()),
    boatName: v.string(),
    className: v.optional(v.string()),
    gph: v.optional(v.float64()),
    issueDate: v.string(),
    refNo: v.string(),
    sailNumber: v.string(),
    source: v.union(v.literal("orc"), v.literal("manual")),
    totInshore: v.optional(v.float64()),
    totOffshore: v.optional(v.float64()),
  }).index("by_refNo", ["refNo"]),
  races: defineTable({
    course: v.optional(v.union(v.literal("inshore"), v.literal("offshore"))),
    date: v.string(),
    distanceMiles: v.optional(v.float64()),
    fleetId: v.id("fleets"),
    number: v.float64(),
    published: v.boolean(),
    results: v.array(
      v.object({
        code: v.optional(
          v.union(
            v.literal("DNC"),
            v.literal("DNS"),
            v.literal("OCS"),
            v.literal("DNF"),
            v.literal("RET"),
            v.literal("DSQ"),
            v.literal("NSC"),
          ),
        ),
        elapsedSeconds: v.optional(v.float64()),
        entryId: v.id("entries"),
        redressPoints: v.optional(v.float64()),
        tod: v.optional(v.float64()),
        tot: v.optional(v.float64()),
      }),
    ),
    startTime: v.optional(v.string()),
    timeLimitSeconds: v.optional(v.float64()),
  }).index("by_fleet", ["fleetId"]),
  regattas: defineTable({
    classCodes: v.array(v.string()),
    committee: v.optional(
      v.array(v.object({ name: v.string(), role: v.string() })),
    ),
    endDate: v.string(),
    level: v.string(),
    name: v.string(),
    organizerClubIds: v.array(v.id("clubs")),
    published: v.boolean(),
    slug: v.string(),
    startDate: v.string(),
    venueName: v.optional(v.string()),
    venueCity: v.optional(v.string()),
    courseArea: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  })
    .index("by_published_startDate", ["published", "startDate"])
    .index("by_slug", ["slug"])
    .index("by_startDate", ["startDate"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["published"],
    }),
  users: defineTable({
    clerkSubject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("participante"),
    ),
  })
    .index("by_clerkSubject", ["clerkSubject"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),
  siteSettings: defineTable({
    regattaId: v.id("regattas"),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
    heroImageUrl: v.optional(v.string()),
    heroCredit: v.optional(v.string()),
    registrationUrl: v.optional(v.string()),
    facebookPageUrl: v.optional(v.string()),
    mapStyleUrl: v.optional(v.string()),
    urgentEnabled: v.optional(v.boolean()),
    urgentMessage: v.optional(v.string()),
    urgentHref: v.optional(v.string()),
    partners: v.optional(
      v.array(
        v.object({
          name: v.string(),
          href: v.optional(v.string()),
          logoUrl: v.optional(v.string()),
        }),
      ),
    ),
    ...auditFields,
  }).index("by_regatta", ["regattaId"]),
  scheduleItems: defineTable({
    regattaId: v.id("regattas"),
    date: v.string(),
    time: v.string(),
    title: v.string(),
    type: v.union(
      v.literal("regata"),
      v.literal("briefing"),
      v.literal("social"),
      v.literal("cerimonia"),
      v.literal("comite"),
      v.literal("outro"),
    ),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    highlight: v.optional(v.boolean()),
    ...auditFields,
  })
    .index("by_regatta", ["regattaId"])
    .index("by_regatta_date", ["regattaId", "date"]),
  newsPosts: defineTable({
    regattaId: v.id("regattas"),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    imageCredit: v.optional(v.string()),
    publishedAt: v.string(),
    featured: v.optional(v.boolean()),
    ...auditFields,
  })
    .index("by_regatta", ["regattaId"])
    .index("by_slug", ["slug"]),
  mediaItems: defineTable({
    regattaId: v.id("regattas"),
    title: v.string(),
    imageUrl: v.string(),
    sourceUrl: v.optional(v.string()),
    credit: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    ...auditFields,
  }).index("by_regatta", ["regattaId"]),
  resultSnapshots: defineTable({
    regattaId: v.id("regattas"),
    title: v.string(),
    classCode: v.string(),
    scope: v.union(v.literal("geral"), v.literal("regata")),
    raceNumber: v.optional(v.float64()),
    publishedAt: v.string(),
    rows: v.array(
      v.object({
        rank: v.float64(),
        entryId: v.optional(v.id("entries")),
        boatName: v.string(),
        sailNumber: v.string(),
        skipper: v.optional(v.string()),
        clubName: v.optional(v.string()),
        points: v.float64(),
        raceScores: v.array(v.string()),
        note: v.optional(v.string()),
      }),
    ),
    ...auditFields,
  })
    .index("by_regatta", ["regattaId"])
    .index("by_regatta_class", ["regattaId", "classCode"]),
  trackingDemos: defineTable({
    regattaId: v.id("regattas"),
    title: v.string(),
    frames: v.array(
      v.object({
        second: v.float64(),
        positions: v.array(
          v.object({
            entryId: v.optional(v.id("entries")),
            label: v.string(),
            classCode: v.string(),
            sailNumber: v.optional(v.string()),
            lng: v.float64(),
            lat: v.float64(),
            sog: v.optional(v.float64()),
            heading: v.optional(v.float64()),
          }),
        ),
      }),
    ),
    ...auditFields,
  }).index("by_regatta", ["regattaId"]),
});
