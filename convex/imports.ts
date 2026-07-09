/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

const EVENT_SLUG = "campeonato-portugal-orc-2026";
const IMPORT_USER_SUBJECT = "system:boat-import";
const DEFAULT_SOURCE = "convex:trustworthy-magpie-581:boats";

const sourceBoatValidator = v.object({
  _creationTime: v.optional(v.float64()),
  _id: v.optional(v.string()),
  certificateId: v.optional(v.string()),
  classCode: v.optional(v.string()),
  clubId: v.optional(v.string()),
  name: v.string(),
  ownerUserId: v.optional(v.string()),
  sailNumber: v.string(),
});

const sourceClubValidator = v.object({
  _creationTime: v.optional(v.float64()),
  _id: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  contactWebsite: v.optional(v.string()),
  isOwner: v.optional(v.boolean()),
  name: v.string(),
  region: v.optional(v.string()),
  shortName: v.optional(v.string()),
});

const sourceCertificateValidator = v.object({
  _creationTime: v.optional(v.float64()),
  _id: v.optional(v.string()),
  aphT: v.optional(v.float64()),
  boatName: v.string(),
  className: v.optional(v.string()),
  gph: v.optional(v.float64()),
  issueDate: v.string(),
  refNo: v.string(),
  sailNumber: v.string(),
  source: v.optional(v.string()),
  totInshore: v.optional(v.float64()),
  totOffshore: v.optional(v.float64()),
});

const sourceOwnerValidator = v.object({
  _creationTime: v.optional(v.float64()),
  _id: v.optional(v.string()),
  clerkSubject: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  role: v.optional(v.string()),
});

type ImportStats = {
  boatsInserted: number;
  boatsUpdated: number;
  entriesInserted: number;
  entriesUpdated: number;
  certificatesInserted: number;
  certificatesUpdated: number;
  clubsInserted: number;
  clubsReused: number;
};

function clean(value: string | undefined | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeClassCode(sourceClassCode: string | undefined, fallback: string) {
  const code = clean(sourceClassCode).toUpperCase().replace(/[\s-]+/g, "_");
  if (["ORC_A", "ORC0", "ORC_0", "ORC1", "ORC_1", "ORC_I"].includes(code)) {
    return "ORC_A";
  }
  if (
    ["ORC_B", "ORC2", "ORC_2", "ORCII", "ORC_II", "ORC3", "ORC_3"].includes(code)
  ) {
    return "ORC_B";
  }
  return fallback;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function stableNumber(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function interpolateCourse(progress: number, offset: number) {
  const course = [
    [-8.879, 40.122],
    [-8.879, 40.154],
    [-8.872, 40.158],
    [-8.883, 40.151],
    [-8.888, 40.123],
    [-8.872, 40.123],
    [-8.879, 40.154],
    [-8.872, 40.158],
    [-8.861, 40.119],
  ];
  const bounded = Math.max(0, Math.min(1, progress));
  const segmentProgress = bounded * (course.length - 1);
  const segmentIndex = Math.min(course.length - 2, Math.floor(segmentProgress));
  const localProgress = segmentProgress - segmentIndex;
  const [startLng, startLat] = course[segmentIndex];
  const [endLng, endLat] = course[segmentIndex + 1];
  const lng = startLng + (endLng - startLng) * localProgress + offset;
  const lat = startLat + (endLat - startLat) * localProgress + offset * 0.45;
  const heading =
    (Math.atan2(endLng - startLng, endLat - startLat) * 180) / Math.PI + 360;
  return {
    lng,
    lat,
    heading: Math.round(heading % 360),
  };
}

function byId<T extends { _id?: string }>(items: T[] | undefined) {
  return new Map((items ?? []).filter((item) => item._id).map((item) => [item._id, item]));
}

async function currentEditorId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", identity.subject))
    .unique();
  if (!user || !["admin", "editor"].includes(user.role)) {
    return null;
  }
  return user._id;
}

async function ensureImportUser(ctx: any) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", IMPORT_USER_SUBJECT))
    .unique();
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("users", {
    clerkSubject: IMPORT_USER_SUBJECT,
    email: "importacao@avelas.local",
    name: "Importacao Convex barcos",
    role: "editor",
  });
}

async function requireImportAccess(ctx: any, token: string | undefined) {
  const editorId = await currentEditorId(ctx);
  if (editorId) {
    return editorId;
  }

  const configuredToken = process.env.BOAT_IMPORT_TOKEN;
  if (configuredToken && token === configuredToken) {
    return await ensureImportUser(ctx);
  }

  if (process.env.ENABLE_DEV_IMPORT === "true") {
    return await ensureImportUser(ctx);
  }

  throw new Error("Importacao bloqueada. Use um editor/admin ou BOAT_IMPORT_TOKEN.");
}

async function ensureOrganizerClub(ctx: any) {
  const clubs = await ctx.db.query("clubs").take(500);
  const existing = clubs.find(
    (club: any) =>
      clean(club.shortName).toUpperCase() === "AVELAS" ||
      clean(club.name).toUpperCase() === "AVELAS",
  );
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("clubs", {
    contactWebsite: "https://avelas.pt",
    isOwner: true,
    name: "AVELAS",
    region: "Norte",
    shortName: "AVELAS",
  });
}

async function ensureBoatClass(ctx: any, code: string, name: string) {
  const existing = await ctx.db
    .query("boatClasses")
    .withIndex("by_code", (q: any) => q.eq("code", code))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { name, oneDesign: false });
    return existing._id;
  }
  return await ctx.db.insert("boatClasses", { code, name, oneDesign: false });
}

async function ensureRegatta(ctx: any, organizerClubId: string) {
  const existing = await ctx.db
    .query("regattas")
    .withIndex("by_slug", (q: any) => q.eq("slug", EVENT_SLUG))
    .unique();

  const regatta = {
    classCodes: ["ORC_A", "ORC_B"],
    committee: [
      { name: "Comissao de Regatas", role: "Gestao de prova" },
      { name: "Comite Tecnico", role: "Medicoes e certificados ORC" },
      { name: "Juri", role: "Protestos e decisoes" },
    ],
    contactEmail: "secretaria@avelas.pt",
    courseArea: "Campo 1",
    endDate: "2026-07-14",
    level: "Campeonato de Portugal",
    name: "Campeonato de Portugal ORC 2026",
    organizerClubIds: [organizerClubId],
    published: true,
    slug: EVENT_SLUG,
    startDate: "2026-07-11",
    venueCity: "Figueira da Foz",
    venueName: "Marina da Figueira da Foz",
  };

  if (existing) {
    await ctx.db.patch(existing._id, regatta);
    return existing._id;
  }
  return await ctx.db.insert("regattas", regatta);
}

async function ensureFleet(ctx: any, regattaId: string, code: string, name: string) {
  const fleets = await ctx.db
    .query("fleets")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .collect();
  const existing = fleets.find((fleet: any) => fleet.classCodes.includes(code));
  if (existing) {
    await ctx.db.patch(existing._id, {
      classCodes: [code],
      discards: existing.discards ?? 1,
      name,
      scoringMethod: "orc-tot",
    });
    return existing._id;
  }
  return await ctx.db.insert("fleets", {
    classCodes: [code],
    discards: 1,
    name,
    regattaId,
    scoringMethod: "orc-tot",
  });
}

async function ensureBaseContent(ctx: any, regattaId: string, userId: string) {
  const now = Date.now();
  const audit = {
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };

  const settings = await ctx.db
    .query("siteSettings")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  if (!settings) {
    await ctx.db.insert("siteSettings", {
      regattaId,
      heroTitle: "Campeonato de Portugal ORC 2026",
      heroSubtitle:
        "Competicao ORC A/B organizada pela AVELAS na Marina da Figueira da Foz.",
      heroImageUrl:
        "https://images.unsplash.com/photo-1631995037903-c4f8064c48ae?auto=format&fit=crop&w=2200&q=82",
      heroCredit:
        "Imagem demonstrativa: John Bell / Unsplash. Substituir por foto aprovada do Facebook.",
      registrationUrl: "mailto:secretaria@avelas.pt?subject=Inscricao ORC 2026",
      facebookPageUrl:
        "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
      urgentEnabled: true,
      urgentMessage:
        "Barcos importados do projeto Convex leme; confirmacao final pelo comite.",
      urgentHref: "/inscritos",
      partners: [{ name: "AVELAS" }, { name: "Marina da Figueira da Foz" }],
      ...audit,
    });
  }

  const schedule = await ctx.db
    .query("scheduleItems")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  if (!schedule) {
    for (const item of [
      ["2026-07-11", "09:00", "Abertura do secretariado", "comite", true],
      ["2026-07-11", "14:00", "Regata 1 prevista", "regata", true],
      ["2026-07-12", "12:00", "Regatas barlavento/sotavento", "regata", false],
      ["2026-07-13", "12:00", "Regatas costeiras ORC", "regata", false],
      ["2026-07-14", "17:30", "Cerimonia de entrega de premios", "cerimonia", true],
    ] as const) {
      await ctx.db.insert("scheduleItems", {
        regattaId,
        date: item[0],
        time: item[1],
        title: item[2],
        type: item[3],
        location: item[3] === "regata" ? "Campo 1" : "Marina da Figueira da Foz",
        highlight: item[4],
        ...audit,
      });
    }
  }

  const notice = await ctx.db
    .query("notices")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  if (!notice) {
    await ctx.db.insert("notices", {
      regattaId,
      title: "Inscritos importados da base Convex",
      body:
        "A lista inicial de barcos foi sincronizada a partir do projeto leme e sera validada pelo comite.",
      category: "anuncio",
      priority: "importante",
      publishedAt: new Date(now).toISOString(),
      ...audit,
    });
  }

  const news = await ctx.db
    .query("newsPosts")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  if (!news) {
    await ctx.db.insert("newsPosts", {
      regattaId,
      slug: "frota-orc-importada",
      title: "Frota ORC sincronizada para o campeonato",
      excerpt:
        "A lista inicial de barcos foi carregada a partir da base Convex existente da organizacao.",
      body:
        "O portal passa a usar os barcos registados no projeto leme como base da competicao. A validacao final das inscricoes continua a cargo da organizacao.",
      publishedAt: new Date(now).toISOString(),
      featured: true,
      ...audit,
    });
  }

  const media = await ctx.db
    .query("mediaItems")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  if (!media) {
    await ctx.db.insert("mediaItems", {
      regattaId,
      title: "Galeria oficial Facebook",
      imageUrl:
        "https://images.unsplash.com/photo-1631995037903-c4f8064c48ae?auto=format&fit=crop&w=1600&q=82",
      sourceUrl:
        "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
      credit: "Facebook Campeonato de Portugal ORC",
      featured: true,
      ...audit,
    });
  }
}

async function ensureClubFromSource(
  ctx: any,
  sourceClub: any,
  organizerClubId: string,
  stats: ImportStats,
) {
  if (!sourceClub) {
    return null;
  }
  const clubs = await ctx.db.query("clubs").take(500);
  const sourceName = clean(sourceClub.name);
  const sourceShortName = clean(sourceClub.shortName);
  if (sourceClub.isOwner || sourceShortName.toUpperCase() === "AVELA") {
    stats.clubsReused += 1;
    return organizerClubId;
  }
  const existing = clubs.find(
    (club: any) =>
      clean(club.name).toLowerCase() === sourceName.toLowerCase() ||
      (sourceShortName &&
        clean(club.shortName).toLowerCase() === sourceShortName.toLowerCase()),
  );
  if (existing) {
    stats.clubsReused += 1;
    return existing._id;
  }
  stats.clubsInserted += 1;
  return await ctx.db.insert("clubs", {
    contactEmail: sourceClub.contactEmail,
    contactPhone: sourceClub.contactPhone,
    contactWebsite: sourceClub.contactWebsite,
    isOwner: sourceClub.isOwner ?? false,
    name: sourceName,
    region: sourceClub.region,
    shortName: sourceShortName || undefined,
  });
}

async function ensureCertificateFromSource(ctx: any, sourceCertificate: any, stats: ImportStats) {
  if (!sourceCertificate) {
    return null;
  }
  const existing = await ctx.db
    .query("orcCertificates")
    .withIndex("by_refNo", (q: any) => q.eq("refNo", sourceCertificate.refNo))
    .unique();
  const certificate = {
    aphT: sourceCertificate.aphT,
    boatName: sourceCertificate.boatName,
    className: sourceCertificate.className,
    gph: sourceCertificate.gph,
    issueDate: sourceCertificate.issueDate,
    refNo: sourceCertificate.refNo,
    sailNumber: sourceCertificate.sailNumber,
    source: sourceCertificate.source === "manual" ? "manual" : "orc",
    totInshore: sourceCertificate.totInshore,
    totOffshore: sourceCertificate.totOffshore,
  };
  if (existing) {
    await ctx.db.patch(existing._id, certificate);
    stats.certificatesUpdated += 1;
    return existing._id;
  }
  stats.certificatesInserted += 1;
  return await ctx.db.insert("orcCertificates", certificate);
}

async function findExistingEntry(ctx: any, source: string, boat: any, classCode: string) {
  if (boat._id) {
    const bySource = await ctx.db
      .query("entries")
      .withIndex("by_external_boat", (q: any) =>
        q.eq("externalSource", source).eq("externalBoatId", boat._id),
      )
      .unique();
    if (bySource) {
      return bySource;
    }
  }
  const candidates = await ctx.db
    .query("entries")
    .withIndex("by_classCode", (q: any) => q.eq("classCode", classCode))
    .collect();
  return candidates.find(
    (entry: any) =>
      clean(entry.sailNumber).toLowerCase() === clean(boat.sailNumber).toLowerCase() ||
      clean(entry.boatName).toLowerCase() === clean(boat.name).toLowerCase(),
  );
}

async function findExistingBoat(ctx: any, source: string, boat: any, classCode: string) {
  if (boat._id) {
    const bySource = await ctx.db
      .query("boats")
      .withIndex("by_external_boat", (q: any) =>
        q.eq("externalSource", source).eq("externalBoatId", boat._id),
      )
      .unique();
    if (bySource) {
      return bySource;
    }
  }
  const candidates = await ctx.db
    .query("boats")
    .withIndex("by_classCode", (q: any) => q.eq("classCode", classCode))
    .collect();
  return candidates.find(
    (candidate: any) =>
      clean(candidate.sailNumber).toLowerCase() === clean(boat.sailNumber).toLowerCase() ||
      clean(candidate.name).toLowerCase() === clean(boat.name).toLowerCase(),
  );
}

async function getApprovedFleetEntries(ctx: any, regattaId: string) {
  const fleets = await ctx.db
    .query("fleets")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .collect();
  const groups = await Promise.all(
    fleets.map(async (fleet: any) => ({
      fleet,
      entries: await ctx.db
        .query("entries")
        .withIndex("by_fleet_status", (q: any) =>
          q.eq("fleetId", fleet._id).eq("status", "aprovada"),
        )
        .collect(),
    })),
  );
  const entries = groups.flatMap((group) => group.entries);
  const clubIds = Array.from(
    new Set(entries.map((entry: any) => entry.clubId).filter(Boolean)),
  );
  const certificateIds = Array.from(
    new Set(entries.map((entry: any) => entry.certificateId).filter(Boolean)),
  );
  const clubs = await Promise.all(clubIds.map((id) => ctx.db.get(id)));
  const certificates = await Promise.all(
    certificateIds.map((id) => ctx.db.get(id)),
  );
  const clubById = new Map(clubs.filter(Boolean).map((club: any) => [club._id, club]));
  const certificateById = new Map(
    certificates
      .filter(Boolean)
      .map((certificate: any) => [certificate._id, certificate]),
  );

  return groups.map((group) => ({
    fleet: group.fleet,
    entries: group.entries.map((entry: any, index: number) => ({
      entry,
      index,
      club: entry.clubId ? clubById.get(entry.clubId) : null,
      certificate: entry.certificateId ? certificateById.get(entry.certificateId) : null,
    })),
  }));
}

function scoreEntry(entry: any, certificate: any, index: number, distanceMiles: number) {
  const seed = stableNumber(`${entry.boatName}-${entry.sailNumber}`);
  const gph = certificate?.gph ?? 590;
  const ratingFactor = certificate?.totInshore ?? certificate?.totOffshore ?? 1;
  const baseElapsed = distanceMiles * 600;
  const speedCredit = (590 - gph) * 7;
  const fleetSpread = index * 80 + (seed % 130) - 55;
  const elapsedSeconds = Math.max(
    distanceMiles * 430,
    Math.round(baseElapsed - speedCredit + fleetSpread),
  );
  const correctedSeconds = Math.round(elapsedSeconds * ratingFactor);
  const averageSpeed = distanceMiles / (elapsedSeconds / 3600);

  return {
    elapsedSeconds,
    correctedSeconds,
    averageSpeed: Math.round(averageSpeed * 10) / 10,
  };
}

async function upsertTrackingDemo(
  ctx: any,
  regattaId: string,
  userId: string,
  scoredEntries: any[],
) {
  if (scoredEntries.length === 0) {
    return null;
  }
  const maxElapsed = Math.max(
    ...scoredEntries.map((entry) => entry.elapsedSeconds),
    1,
  );
  const frameCount = 10;
  const frames = Array.from({ length: frameCount }, (_, frameIndex) => {
    const second = Math.round((maxElapsed * frameIndex) / (frameCount - 1));
    return {
      second,
      positions: scoredEntries.map((item, index) => {
        const progress = second / item.elapsedSeconds;
        const offset = (index - (scoredEntries.length - 1) / 2) * 0.0022;
        const point = interpolateCourse(progress, offset);
        return {
          entryId: item.entry._id,
          label: item.entry.boatName,
          classCode: item.entry.classCode,
          sailNumber: item.entry.sailNumber,
          lng: point.lng,
          lat: point.lat,
          sog: item.averageSpeed,
          heading: point.heading,
        };
      }),
    };
  });

  const existing = await ctx.db
    .query("trackingDemos")
    .withIndex("by_regatta", (q: any) => q.eq("regattaId", regattaId))
    .first();
  const now = Date.now();
  const patch = {
    title: "Regata 1 simulada - Barlavento/Sotavento",
    frames,
    updatedAt: now,
    updatedBy: userId,
  };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }
  return await ctx.db.insert("trackingDemos", {
    regattaId,
    ...patch,
    createdAt: now,
    createdBy: userId,
  });
}

async function upsertRace(ctx: any, fleet: any, scoredEntries: any[], options: any) {
  const existing = (
    await ctx.db
      .query("races")
      .withIndex("by_fleet", (q: any) => q.eq("fleetId", fleet._id))
      .collect()
  ).find((race: any) => race.number === options.raceNumber);
  const race = {
    course: "inshore",
    date: options.date,
    distanceMiles: options.distanceMiles,
    fleetId: fleet._id,
    number: options.raceNumber,
    published: true,
    results: scoredEntries.map((item) => ({
      entryId: item.entry._id,
      elapsedSeconds: item.elapsedSeconds,
      tot: item.correctedSeconds,
    })),
    startTime: options.startTime,
  };
  if (existing) {
    await ctx.db.patch(existing._id, race);
    return existing._id;
  }
  return await ctx.db.insert("races", race);
}

async function upsertResultSnapshot(
  ctx: any,
  regattaId: string,
  userId: string,
  classCode: string,
  title: string,
  scope: "geral" | "regata",
  raceNumber: number | undefined,
  rows: any[],
) {
  const now = Date.now();
  const existing = (
    await ctx.db
      .query("resultSnapshots")
      .withIndex("by_regatta_class", (q: any) =>
        q.eq("regattaId", regattaId).eq("classCode", classCode),
      )
      .collect()
  ).find(
    (snapshot: any) =>
      snapshot.scope === scope &&
      (snapshot.raceNumber ?? null) === (raceNumber ?? null) &&
      snapshot.title === title,
  );
  const snapshot = {
    regattaId,
    title,
    classCode,
    scope,
    raceNumber,
    publishedAt: new Date(now).toISOString(),
    rows,
    updatedAt: now,
    updatedBy: userId,
  };
  if (existing) {
    await ctx.db.patch(existing._id, snapshot);
    return existing._id;
  }
  return await ctx.db.insert("resultSnapshots", {
    ...snapshot,
    createdAt: now,
    createdBy: userId,
  });
}

async function publishDemoSimulation(ctx: any, regattaId: string, userId: string, options?: any) {
  const raceOptions = {
    raceNumber: options?.raceNumber ?? 1,
    date: options?.date ?? "2026-07-11",
    startTime: options?.startTime ?? "14:00",
    distanceMiles: options?.distanceMiles ?? 12.4,
  };
  const groups = await getApprovedFleetEntries(ctx, regattaId);
  const scoredGroups = groups
    .map((group) => ({
      fleet: group.fleet,
      entries: group.entries
        .map((item: any, index: number) => ({
          ...item,
          ...scoreEntry(item.entry, item.certificate, index, raceOptions.distanceMiles),
        }))
        .sort((a: any, b: any) => a.correctedSeconds - b.correctedSeconds),
    }))
    .filter((group) => group.entries.length > 0);
  const allScoredEntries = scoredGroups.flatMap((group) => group.entries);
  await upsertTrackingDemo(ctx, regattaId, userId, allScoredEntries);

  const snapshotIds = [];
  for (const group of scoredGroups) {
    await upsertRace(ctx, group.fleet, group.entries, raceOptions);
    const rows = group.entries.map((item: any, index: number) => ({
      rank: index + 1,
      entryId: item.entry._id,
      boatName: item.entry.boatName,
      sailNumber: item.entry.sailNumber,
      skipper: item.entry.skipper,
      clubName: item.club?.shortName ?? item.club?.name,
      elapsedSeconds: item.elapsedSeconds,
      correctedSeconds: item.correctedSeconds,
      points: index + 1,
      raceScores: [String(index + 1)],
      note: [
        `Tempo real ${formatDuration(item.elapsedSeconds)}`,
        `corrigido ${formatDuration(item.correctedSeconds)}`,
        item.certificate?.refNo ? `cert. ${item.certificate.refNo}` : null,
        typeof item.certificate?.gph === "number"
          ? `GPH ${item.certificate.gph.toFixed(1)}`
          : null,
        typeof item.certificate?.totInshore === "number"
          ? `ToT ${item.certificate.totInshore.toFixed(3)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
    snapshotIds.push(
      await upsertResultSnapshot(
        ctx,
        regattaId,
        userId,
        group.fleet.classCodes[0] ?? "ORC",
        `Regata ${raceOptions.raceNumber} - tempos simulados`,
        "regata",
        raceOptions.raceNumber,
        rows,
      ),
    );
    snapshotIds.push(
      await upsertResultSnapshot(
        ctx,
        regattaId,
        userId,
        group.fleet.classCodes[0] ?? "ORC",
        "Classificacao geral simulada",
        "geral",
        undefined,
        rows,
      ),
    );
  }

  return {
    boats: allScoredEntries.length,
    fleets: scoredGroups.length,
    snapshots: snapshotIds.filter(Boolean).length,
  };
}

export const importCompetitionBoats = mutationGeneric({
  args: {
    boats: v.array(sourceBoatValidator),
    certificates: v.optional(v.array(sourceCertificateValidator)),
    clubs: v.optional(v.array(sourceClubValidator)),
    defaultClassCode: v.optional(
      v.union(v.literal("ORC_A"), v.literal("ORC_B")),
    ),
    owners: v.optional(v.array(sourceOwnerValidator)),
    source: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireImportAccess(ctx, args.token);
    const organizerClubId = await ensureOrganizerClub(ctx);
    const regattaId = await ensureRegatta(ctx, organizerClubId);
    await ensureBoatClass(ctx, "ORC_A", "ORC A");
    await ensureBoatClass(ctx, "ORC_B", "ORC B");
    const fleetByClass = new Map([
      ["ORC_A", await ensureFleet(ctx, regattaId, "ORC_A", "ORC A")],
      ["ORC_B", await ensureFleet(ctx, regattaId, "ORC_B", "ORC B")],
    ]);
    await ensureBaseContent(ctx, regattaId, userId);

    const stats: ImportStats = {
      boatsInserted: 0,
      boatsUpdated: 0,
      entriesInserted: 0,
      entriesUpdated: 0,
      certificatesInserted: 0,
      certificatesUpdated: 0,
      clubsInserted: 0,
      clubsReused: 0,
    };
    const source = args.source ?? DEFAULT_SOURCE;
    const clubsBySourceId = byId(args.clubs);
    const certificatesBySourceId = byId(args.certificates);
    const ownersBySourceId = byId(args.owners);
    const now = Date.now();

    for (const boat of args.boats) {
      const boatName = clean(boat.name);
      const sailNumber = clean(boat.sailNumber);
      if (!boatName || !sailNumber) {
        continue;
      }

      const classCode = normalizeClassCode(
        boat.classCode,
        args.defaultClassCode ?? "ORC_B",
      );
      const fleetId = fleetByClass.get(classCode);
      if (!fleetId) {
        continue;
      }

      const localClubId = await ensureClubFromSource(
        ctx,
        boat.clubId ? clubsBySourceId.get(boat.clubId) : null,
        organizerClubId,
        stats,
      );
      const localCertificateId = await ensureCertificateFromSource(
        ctx,
        boat.certificateId ? certificatesBySourceId.get(boat.certificateId) : null,
        stats,
      );
      const owner = boat.ownerUserId ? ownersBySourceId.get(boat.ownerUserId) : null;
      const skipper = clean(owner?.name) || "A confirmar";
      const sourcePatch = {
        classCode,
        clubId: localClubId ?? undefined,
        certificateId: localCertificateId ?? undefined,
        externalBoatId: boat._id,
        externalClassCode: boat.classCode,
        externalSource: source,
        sailNumber,
        syncedAt: now,
      };

      const existingBoat = await findExistingBoat(ctx, source, boat, classCode);
      if (existingBoat) {
        await ctx.db.patch(existingBoat._id, {
          ...sourcePatch,
          name: boatName,
          ownerUserId: existingBoat.ownerUserId ?? userId,
        });
        stats.boatsUpdated += 1;
      } else {
        await ctx.db.insert("boats", {
          ...sourcePatch,
          name: boatName,
          ownerUserId: userId,
        });
        stats.boatsInserted += 1;
      }

      const existingEntry = await findExistingEntry(ctx, source, boat, classCode);
      if (existingEntry) {
        await ctx.db.patch(existingEntry._id, {
          ...sourcePatch,
          boatName,
          fleetId,
          owner: skipper,
          skipper,
          status: "aprovada",
        });
        stats.entriesUpdated += 1;
      } else {
        await ctx.db.insert("entries", {
          ...sourcePatch,
          boatName,
          fleetId,
          owner: skipper,
          skipper,
          status: "aprovada",
        });
        stats.entriesInserted += 1;
      }
    }

    const simulation = await publishDemoSimulation(ctx, regattaId, userId);

    return {
      regattaId,
      source,
      simulation,
      stats,
      totalSourceBoats: args.boats.length,
    };
  },
});

export const generateDemoRace = mutationGeneric({
  args: {
    token: v.optional(v.string()),
    raceNumber: v.optional(v.float64()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    distanceMiles: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await requireImportAccess(ctx, args.token);
    const organizerClubId = await ensureOrganizerClub(ctx);
    const regattaId = await ensureRegatta(ctx, organizerClubId);
    await ensureBoatClass(ctx, "ORC_A", "ORC A");
    await ensureBoatClass(ctx, "ORC_B", "ORC B");
    await ensureFleet(ctx, regattaId, "ORC_A", "ORC A");
    await ensureFleet(ctx, regattaId, "ORC_B", "ORC B");
    await ensureBaseContent(ctx, regattaId, userId);
    const simulation = await publishDemoSimulation(ctx, regattaId, userId, args);
    return {
      regattaId,
      simulation,
    };
  },
});
