/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const classLabels: Record<string, string> = {
  ORC_A: "ORC A",
  ORC_B: "ORC B",
};

const LOCAL_ADMIN_SUBJECT = "local:avelas-admin";
const LOCAL_ADMIN_EMAIL = "local-admin@avelas.local";
const LOCAL_ADMIN_NAME = "Admin local AVELAS";

const localAdminEnabled = () => process.env.ENABLE_LOCAL_ADMIN === "true";

const portalAdminEmails = () =>
  (process.env.PORTAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const portalEditorEmails = () =>
  (process.env.PORTAL_EDITOR_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

async function getRegatta(ctx: any, slug: string) {
  return await ctx.db
    .query("regattas")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
}

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (!localAdminEnabled()) {
      return null;
    }

    return {
      _id: "local-admin",
      clerkSubject: LOCAL_ADMIN_SUBJECT,
      email: LOCAL_ADMIN_EMAIL,
      name: LOCAL_ADMIN_NAME,
      role: "admin",
    };
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", identity.subject))
    .unique();
}

async function ensureLocalAdminUser(ctx: any) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", LOCAL_ADMIN_SUBJECT))
    .unique();

  const userFields = {
    clerkSubject: LOCAL_ADMIN_SUBJECT,
    email: LOCAL_ADMIN_EMAIL,
    name: LOCAL_ADMIN_NAME,
    role: "admin" as const,
  };

  if (existing) {
    if (
      existing.email !== userFields.email ||
      existing.name !== userFields.name ||
      existing.role !== userFields.role
    ) {
      await ctx.db.patch(existing._id, userFields);
    }
    return { ...existing, ...userFields };
  }

  const id = await ctx.db.insert("users", userFields);
  const user = await ctx.db.get(id);
  if (!user) {
    throw new Error("Nao foi possivel criar o admin local.");
  }
  return user;
}

async function getWritableCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return localAdminEnabled() ? await ensureLocalAdminUser(ctx) : null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", identity.subject))
    .unique();
}

async function requireEditor(ctx: any) {
  const user = await getWritableCurrentUser(ctx);
  if (!user || !["admin", "editor"].includes(user.role)) {
    throw new Error("Sem permissao para editar este portal.");
  }
  return user;
}

async function requireAdmin(ctx: any) {
  const user = await getWritableCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta acao.");
  }
  return user;
}

function nowAudit(userId: string) {
  const now = Date.now();
  return {
    updatedAt: now,
    updatedBy: userId,
  };
}

function createAudit(userId: string) {
  const now = Date.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };
}

function displayClassName(code: string) {
  return classLabels[code] ?? code.replace("_", " ");
}

function displayUserName(user: any) {
  const subject = String(user?.clerkSubject ?? "");
  if (!user || subject.startsWith("system:") || subject.startsWith("local:")) {
    return null;
  }
  return user.name ?? user.email ?? null;
}

async function readPortal(ctx: any, slug: string) {
  const regatta = await getRegatta(ctx, slug);
  if (!regatta) {
    return null;
  }

  const [
    settings,
    schedule,
    notices,
    fleets,
    boatClasses,
    boats,
    news,
    media,
    results,
    tracking,
  ] = await Promise.all([
    ctx.db
      .query("siteSettings")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .first(),
    ctx.db
      .query("scheduleItems")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db
      .query("notices")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db
      .query("fleets")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db.query("boatClasses").take(200),
    ctx.db.query("boats").take(1000),
    ctx.db
      .query("newsPosts")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db
      .query("mediaItems")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db
      .query("resultSnapshots")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .collect(),
    ctx.db
      .query("trackingDemos")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .first(),
  ]);

  const labels = Object.fromEntries(
    boatClasses.map((boatClass: any) => [boatClass.code, boatClass.name]),
  );

  const entryGroups = await Promise.all(
    fleets.map((fleet: any) =>
      ctx.db
        .query("entries")
        .withIndex("by_fleet_status", (q: any) =>
          q.eq("fleetId", fleet._id).eq("status", "aprovada"),
        )
        .collect(),
    ),
  );
  const rawEntries = entryGroups.flat();
  const regattaClassCodes = new Set(regatta.classCodes ?? []);
  const competitionBoats = boats.filter(
    (boat: any) =>
      regattaClassCodes.size === 0 ||
      regattaClassCodes.has(boat.classCode) ||
      String(boat.classCode ?? "").startsWith("ORC"),
  );
  const clubIds = Array.from(
    new Set(
      [...rawEntries, ...competitionBoats]
        .map((record: any) => record.clubId)
        .filter(Boolean),
    ),
  );
  const certificateIds = Array.from(
    new Set(
      [...rawEntries, ...competitionBoats]
        .map((record: any) => record.certificateId)
        .filter(Boolean),
    ),
  );
  const ownerIds = Array.from(
    new Set(competitionBoats.map((boat: any) => boat.ownerUserId).filter(Boolean)),
  );
  const [clubs, certificates, owners] = await Promise.all([
    Promise.all(clubIds.map((id) => ctx.db.get(id))),
    Promise.all(certificateIds.map((id) => ctx.db.get(id))),
    Promise.all(ownerIds.map((id) => ctx.db.get(id))),
  ]);
  const clubById = new Map(clubs.filter(Boolean).map((club: any) => [club._id, club]));
  const certificateById = new Map(
    certificates
      .filter(Boolean)
      .map((certificate: any) => [certificate._id, certificate]),
  );
  const ownerById = new Map(owners.filter(Boolean).map((owner: any) => [owner._id, owner]));
  const displayEntries =
    competitionBoats.length > 0
      ? competitionBoats.map((boat: any) => ({ kind: "boat", record: boat }))
      : rawEntries.map((entry: any) => ({ kind: "entry", record: entry }));

  const noticesWithUrls = await Promise.all(
    notices.map(async (notice: any) => {
      const attachmentUrl = notice.attachmentStorageId
        ? await ctx.storage.getUrl(notice.attachmentStorageId)
        : null;
      return {
        id: notice._id,
        title: notice.title,
        body: notice.body,
        category: notice.category ?? "aviso",
        priority: notice.priority ?? "normal",
        publishedAt: notice.publishedAt ?? new Date(notice._creationTime).toISOString(),
        attachmentUrl,
        attachmentName: notice.attachmentName ?? null,
      };
    }),
  );

  const firstOrganizerId = regatta.organizerClubIds?.[0];
  const organizerClub = firstOrganizerId ? await ctx.db.get(firstOrganizerId) : null;

  return {
    event: {
      id: regatta._id,
      slug: regatta.slug,
      name: regatta.name,
      organizer: organizerClub?.shortName ?? organizerClub?.name ?? "AVELAS",
      level: regatta.level,
      startDate: regatta.startDate,
      endDate: regatta.endDate,
      venueName: regatta.venueName ?? "Marina da Figueira da Foz",
      venueCity: regatta.venueCity ?? "Figueira da Foz",
      courseArea: regatta.courseArea ?? "Campo 1",
      committee: regatta.committee ?? [],
    },
    settings: {
      heroTitle: settings?.heroTitle ?? regatta.name,
      heroSubtitle:
        settings?.heroSubtitle ??
        "Competicao ORC A/B organizada pela AVELAS na Figueira da Foz.",
      heroImageUrl: settings?.heroImageUrl ?? "",
      heroCredit: settings?.heroCredit ?? null,
      registrationUrl: settings?.registrationUrl ?? null,
      facebookPageUrl: settings?.facebookPageUrl ?? null,
      mapStyleUrl: settings?.mapStyleUrl ?? null,
      urgentEnabled: settings?.urgentEnabled ?? false,
      urgentMessage: settings?.urgentMessage ?? null,
      urgentHref: settings?.urgentHref ?? null,
      partners: settings?.partners ?? [],
    },
    classLabels: { ...classLabels, ...labels },
    schedule: schedule
      .map((item: any) => ({
        id: item._id,
        date: item.date,
        time: item.time,
        title: item.title,
        type: item.type,
        location: item.location ?? null,
        description: item.description ?? null,
        highlight: item.highlight ?? false,
      }))
      .sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    notices: noticesWithUrls.sort((a: any, b: any) =>
      b.publishedAt.localeCompare(a.publishedAt),
    ),
    entries: displayEntries
      .map(({ kind, record }: any) => {
        const club = record.clubId ? clubById.get(record.clubId) : null;
        const certificate = record.certificateId
          ? certificateById.get(record.certificateId)
          : null;
        const owner =
          kind === "boat" && record.ownerUserId
            ? ownerById.get(record.ownerUserId)
            : null;
        return {
          id: record._id,
          boatName: kind === "boat" ? record.name : record.boatName,
          classCode: record.classCode,
          className: labels[record.classCode] ?? displayClassName(record.classCode),
          sailNumber: record.sailNumber,
          skipper:
            kind === "boat"
              ? (displayUserName(owner) ?? "A confirmar")
              : record.skipper,
          clubName: club?.shortName ?? club?.name ?? null,
          crew: kind === "boat" ? [] : record.crew ?? [],
          certificateRef: certificate?.refNo ?? null,
          certificateClassName: certificate?.className ?? null,
          certificateIssueDate: certificate?.issueDate ?? null,
          gph: certificate?.gph ?? null,
          totInshore: certificate?.totInshore ?? null,
          totOffshore: certificate?.totOffshore ?? null,
          aphT: certificate?.aphT ?? null,
          photoUrl: kind === "boat" ? null : record.photoUrl ?? null,
        };
      })
      .sort((a: any, b: any) =>
        `${a.classCode} ${a.boatName}`.localeCompare(`${b.classCode} ${b.boatName}`),
      ),
    results: results
      .map((snapshot: any) => ({
        id: snapshot._id,
        title: snapshot.title,
        classCode: snapshot.classCode,
        className: labels[snapshot.classCode] ?? displayClassName(snapshot.classCode),
        scope: snapshot.scope,
        raceNumber: snapshot.raceNumber ?? null,
        publishedAt: snapshot.publishedAt,
        rows: snapshot.rows,
      }))
      .sort((a: any, b: any) => {
        if (a.scope !== b.scope) {
          return a.scope === "geral" ? -1 : 1;
        }
        if (a.scope === "regata") {
          return (b.raceNumber ?? 0) - (a.raceNumber ?? 0);
        }
        return b.publishedAt.localeCompare(a.publishedAt);
      }),
    news: news
      .map((post: any) => ({
        id: post._id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        imageUrl: post.imageUrl ?? null,
        imageCredit: post.imageCredit ?? null,
        publishedAt: post.publishedAt,
        featured: post.featured ?? false,
      }))
      .sort((a: any, b: any) => b.publishedAt.localeCompare(a.publishedAt)),
    media: media
      .map((item: any) => ({
        id: item._id,
        title: item.title,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl ?? null,
        credit: item.credit ?? null,
        featured: item.featured ?? false,
      }))
      .sort((a: any, b: any) => Number(b.featured) - Number(a.featured)),
    trackingDemo: tracking
      ? {
          id: tracking._id,
          title: tracking.title,
          updatedAt: tracking.updatedAt ?? tracking._creationTime,
          frames: tracking.frames,
        }
      : null,
  };
}

export const getPublicPortal = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await readPortal(ctx, args.slug);
  },
});

export const getAdminDashboard = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity && !localAdminEnabled()) {
      return { status: "signedOut", user: null, portal: null };
    }

    const user = await getCurrentUser(ctx);
    const portal = await readPortal(ctx, args.slug);

    return {
      status: user ? "ready" : "needsSync",
      user: user
        ? {
            id: user._id,
            name: user.name ?? identity?.name ?? null,
            email: user.email ?? identity?.email ?? null,
            role: user.role,
          }
        : null,
      portal,
    };
  },
});

export const syncCurrentUser = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      if (localAdminEnabled()) {
        const user = await ensureLocalAdminUser(ctx);
        return user._id;
      }
      throw new Error("Sessao Clerk em falta.");
    }
    const email = (identity.email ?? "").toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q: any) => q.eq("clerkSubject", identity.subject))
      .unique();
    const role = portalAdminEmails().includes(email)
      ? "admin"
      : portalEditorEmails().includes(email)
        ? "editor"
        : existing?.role ?? "participante";

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: email || existing.email,
        name: identity.name ?? existing.name,
        role,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkSubject: identity.subject,
      email,
      name: identity.name,
      role,
    });
  },
});

export const upsertSiteSettings = mutationGeneric({
  args: {
    slug: v.string(),
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
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .first();
    const patch = {
      heroTitle: args.heroTitle,
      heroSubtitle: args.heroSubtitle,
      heroImageUrl: args.heroImageUrl,
      heroCredit: args.heroCredit,
      registrationUrl: args.registrationUrl,
      facebookPageUrl: args.facebookPageUrl,
      mapStyleUrl: args.mapStyleUrl,
      urgentEnabled: args.urgentEnabled,
      urgentMessage: args.urgentMessage,
      urgentHref: args.urgentHref,
    };
    if (existing) {
      await ctx.db.patch(existing._id, { ...patch, ...nowAudit(user._id) });
      return existing._id;
    }
    return await ctx.db.insert("siteSettings", {
      regattaId: regatta._id,
      ...patch,
      partners: [{ name: "AVELAS" }],
      ...createAudit(user._id),
    });
  },
});

export const generateNoticeUploadUrl = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    await requireEditor(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveNotice = mutationGeneric({
  args: {
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("anuncio"),
      v.literal("instrucoes"),
      v.literal("aviso"),
      v.literal("alteracao"),
      v.literal("protesto"),
      v.literal("decisao"),
      v.literal("resultado"),
      v.literal("comite"),
    ),
    priority: v.union(v.literal("normal"), v.literal("importante"), v.literal("urgente")),
    attachmentName: v.optional(v.string()),
    attachmentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    return await ctx.db.insert("notices", {
      regattaId: regatta._id,
      title: args.title,
      body: args.body,
      category: args.category,
      priority: args.priority,
      publishedAt: new Date().toISOString(),
      attachmentName: args.attachmentName,
      attachmentStorageId: args.attachmentStorageId,
      ...createAudit(user._id),
    });
  },
});

export const saveScheduleItem = mutationGeneric({
  args: {
    slug: v.string(),
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
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    return await ctx.db.insert("scheduleItems", {
      regattaId: regatta._id,
      date: args.date,
      time: args.time,
      title: args.title,
      type: args.type,
      location: args.location,
      description: args.description,
      highlight: args.highlight ?? false,
      ...createAudit(user._id),
    });
  },
});

export const saveNewsPost = mutationGeneric({
  args: {
    slug: v.string(),
    postSlug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    imageCredit: v.optional(v.string()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    return await ctx.db.insert("newsPosts", {
      regattaId: regatta._id,
      slug: args.postSlug,
      title: args.title,
      excerpt: args.excerpt,
      body: args.body,
      imageUrl: args.imageUrl,
      imageCredit: args.imageCredit,
      featured: args.featured ?? false,
      publishedAt: new Date().toISOString(),
      ...createAudit(user._id),
    });
  },
});

export const saveMediaItem = mutationGeneric({
  args: {
    slug: v.string(),
    title: v.string(),
    imageUrl: v.string(),
    sourceUrl: v.optional(v.string()),
    credit: v.optional(v.string()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    return await ctx.db.insert("mediaItems", {
      regattaId: regatta._id,
      title: args.title,
      imageUrl: args.imageUrl,
      sourceUrl: args.sourceUrl,
      credit: args.credit,
      featured: args.featured ?? false,
      ...createAudit(user._id),
    });
  },
});

export const saveResultSnapshot = mutationGeneric({
  args: {
    slug: v.string(),
    title: v.string(),
    classCode: v.string(),
    scope: v.union(v.literal("geral"), v.literal("regata")),
    raceNumber: v.optional(v.float64()),
    rows: v.array(
      v.object({
        rank: v.float64(),
        boatName: v.string(),
        sailNumber: v.string(),
        skipper: v.optional(v.string()),
        clubName: v.optional(v.string()),
        points: v.float64(),
        raceScores: v.array(v.string()),
        note: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    return await ctx.db.insert("resultSnapshots", {
      regattaId: regatta._id,
      title: args.title,
      classCode: args.classCode,
      scope: args.scope,
      raceNumber: args.raceNumber,
      rows: args.rows,
      publishedAt: new Date().toISOString(),
      ...createAudit(user._id),
    });
  },
});

export const saveTrackingDemo = mutationGeneric({
  args: {
    slug: v.string(),
    title: v.string(),
    frames: v.array(
      v.object({
        second: v.float64(),
        positions: v.array(
          v.object({
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
  },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const regatta = await getRegatta(ctx, args.slug);
    if (!regatta) throw new Error("Regata nao encontrada.");
    const existing = await ctx.db
      .query("trackingDemos")
      .withIndex("by_regatta", (q: any) => q.eq("regattaId", regatta._id))
      .first();
    const patch = {
      title: args.title,
      frames: args.frames,
      ...nowAudit(user._id),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("trackingDemos", {
      regattaId: regatta._id,
      title: args.title,
      frames: args.frames,
      ...createAudit(user._id),
    });
  },
});

export const setUserRole = mutationGeneric({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("participante"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!user) {
      throw new Error("Utilizador nao encontrado. A pessoa deve iniciar sessao primeiro.");
    }
    await ctx.db.patch(user._id, { role: args.role });
    return user._id;
  },
});
