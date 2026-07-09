"use client";

import {
  AlertTriangle,
  Anchor,
  CalendarDays,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  Menu,
  Newspaper,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo } from "react";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrackingMap } from "@/components/portal/tracking-map";
import { portalApi } from "@/lib/convex-api";
import { defaultPortalData } from "@/lib/demo-data";
import type {
  Entry,
  NewsPost,
  Notice,
  PortalData,
  PortalMode,
  ResultSnapshot,
  ScheduleItem,
} from "@/lib/portal-types";
import { EVENT_SLUG, hasConvexConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

const navItems: Array<{
  href: string;
  label: string;
  mode: PortalMode;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/programa", label: "Programa", mode: "programa", icon: CalendarDays },
  { href: "/quadro-oficial", label: "Avisos", mode: "quadro", icon: Megaphone },
  { href: "/inscritos", label: "Inscritos", mode: "inscritos", icon: Users },
  { href: "/resultados", label: "Resultados", mode: "resultados", icon: Trophy },
  { href: "/tracking", label: "Tracking", mode: "tracking", icon: Radio },
  { href: "/noticias", label: "Notícias", mode: "noticias", icon: Newspaper },
  { href: "/media", label: "Media", mode: "media", icon: ImageIcon },
  { href: "/comite", label: "Comité", mode: "comite", icon: ShieldCheck },
];

const courseDiagramUrl = "/percursos/barlavento-sotavento.png";

function normalizePortalData(remote: unknown): PortalData {
  if (!remote) return defaultPortalData;
  const portal = remote as PortalData;
  return {
    ...defaultPortalData,
    ...portal,
    event: { ...defaultPortalData.event, ...portal.event },
    settings: { ...defaultPortalData.settings, ...portal.settings },
    classLabels: { ...defaultPortalData.classLabels, ...portal.classLabels },
    trackingDemo: portal.trackingDemo ?? defaultPortalData.trackingDemo,
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "—";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatRating(value?: number | null, decimals = 3) {
  if (typeof value !== "number") return "—";
  return value.toFixed(decimals);
}

function groupedSchedule(items: ScheduleItem[]) {
  return items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    acc[item.date] ??= [];
    acc[item.date].push(item);
    return acc;
  }, {});
}

function sectionList(mode: PortalMode): PortalMode[] {
  if (mode === "home") {
    return [
      "programa",
      "quadro",
      "tracking",
      "inscritos",
      "resultados",
      "noticias",
      "media",
      "comite",
    ];
  }
  if (mode === "programa") {
    return ["programa", "tracking", "resultados"];
  }
  return [mode];
}

export function PortalExperience({ mode = "home" }: { mode?: PortalMode }) {
  const remote = useQuery(
    portalApi.getPublicPortal,
    hasConvexConfig ? { slug: EVENT_SLUG } : "skip",
  );
  const data = useMemo(() => normalizePortalData(remote), [remote]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader activeMode={mode} data={data} />
      {data.settings.urgentEnabled && data.settings.urgentMessage ? (
        <Link
          href={data.settings.urgentHref || "/quadro-oficial"}
          className="flex items-center justify-center gap-2 bg-amber-300 px-4 py-2 text-center text-xs font-bold uppercase tracking-normal text-slate-950"
        >
          <AlertTriangle className="size-4" />
          <span>{data.settings.urgentMessage}</span>
        </Link>
      ) : null}
      <Hero data={data} compact={mode !== "home"} />
      <main>
        {sectionList(mode).map((section) => (
          <PortalSection key={section} mode={section} data={data} />
        ))}
      </main>
      <Footer data={data} />
    </div>
  );
}

function SiteHeader({ activeMode, data }: { activeMode: PortalMode; data: PortalData }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-sky-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-300 text-sky-950">
            <Anchor className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black uppercase tracking-normal">
              {data.event.organizer}
            </span>
            <span className="block truncate text-xs text-sky-100">
              ORC 2026 · Figueira da Foz
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-normal text-sky-100 transition hover:bg-white/10 hover:text-white",
                activeMode === item.mode && "bg-white text-sky-950 hover:bg-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden rounded-lg border border-white/25 px-3 py-2 text-xs font-bold uppercase tracking-normal text-white transition hover:bg-white hover:text-sky-950 sm:inline-flex"
          >
            Admin
          </Link>
          <details className="relative lg:hidden">
            <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-white/20">
              <Menu className="size-5" />
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-sky-100/20 bg-sky-950 p-2 shadow-2xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sky-50 hover:bg-white/10"
                  >
                    <Icon className="size-4 text-cyan-200" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/admin"
                className="mt-1 flex items-center gap-2 rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-sky-950"
              >
                <ShieldCheck className="size-4" />
                Admin
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function Hero({ data, compact }: { data: PortalData; compact: boolean }) {
  const heroImage = data.settings.heroImageUrl || defaultPortalData.settings.heroImageUrl;
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-sky-950 text-white",
        compact ? "min-h-[48svh]" : "min-h-[86svh]",
      )}
    >
      <img
        src={heroImage}
        alt="Barcos ORC em competição"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,47,73,.96),rgba(8,47,73,.58),rgba(8,47,73,.16))]" />
      <div className="mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-end px-4 py-10 sm:px-6 lg:py-16">
        <div className="max-w-4xl">
          <Badge className="mb-5 bg-cyan-300 text-sky-950 hover:bg-cyan-300">
            11-14 julho 2026 · {data.event.courseArea}
          </Badge>
          <h1 className="text-balance text-5xl font-black uppercase leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
            {data.settings.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-sky-50 sm:text-xl">
            {data.settings.heroSubtitle}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/tracking"
              className={cn(buttonVariants({ size: "lg" }), "bg-cyan-300 text-sky-950 hover:bg-cyan-200")}
            >
              <Radio className="size-4" />
              Tracking demo
            </Link>
            <Link
              href="/quadro-oficial"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/40 px-3 text-sm font-semibold text-white transition hover:bg-white hover:text-sky-950"
            >
              <Megaphone className="size-4" />
              Quadro oficial
            </Link>
            {data.settings.registrationUrl ? (
              <a
                href={data.settings.registrationUrl}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/40 px-3 text-sm font-semibold text-white transition hover:bg-white hover:text-sky-950"
              >
                <ExternalLink className="size-4" />
                Inscrição
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Metric icon={CalendarDays} label="Datas" value="11-14 Jul" />
          <Metric icon={MapPin} label="Local" value={data.event.venueCity} />
          <Metric icon={Trophy} label="Classes" value="ORC A / ORC B" />
        </div>
        {data.settings.heroCredit ? (
          <p className="mt-4 text-xs text-sky-100/80">{data.settings.heroCredit}</p>
        ) : null}
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/12 px-4 py-3 backdrop-blur">
      <Icon className="size-5 text-cyan-200" />
      <div>
        <p className="text-xs uppercase tracking-normal text-sky-100">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function PortalSection({ mode, data }: { mode: PortalMode; data: PortalData }) {
  switch (mode) {
    case "programa":
      return <ScheduleSection items={data.schedule} />;
    case "quadro":
      return <OfficialBoardSection notices={data.notices} />;
    case "inscritos":
      return <EntriesSection entries={data.entries} classLabels={data.classLabels} />;
    case "resultados":
      return <ResultsSection results={data.results} />;
    case "tracking":
      return <TrackingSection data={data} />;
    case "noticias":
      return <NewsSection posts={data.news} />;
    case "media":
      return <MediaSection media={data.media} facebookUrl={data.settings.facebookPageUrl} />;
    case "comite":
      return <CommitteeSection data={data} />;
    default:
      return null;
  }
}

function SectionShell({
  id,
  eyebrow,
  title,
  children,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section id={id} className={cn("py-12 sm:py-16", dark ? "bg-sky-950 text-white" : "bg-white")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-normal", dark ? "text-cyan-200" : "text-cyan-700")}>
              {eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-normal sm:text-5xl">
              {title}
            </h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function ScheduleSection({ items }: { items: ScheduleItem[] }) {
  const groups = groupedSchedule(items);
  return (
    <SectionShell id="programa" eyebrow="Programa editável" title="Agenda da prova">
      {Object.keys(groups).length ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Object.entries(groups).map(([date, dayItems]) => (
            <div key={date} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black uppercase tracking-normal text-sky-900">
                {formatDate(date)}
              </p>
              <div className="mt-4 space-y-3">
                {dayItems.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={item.highlight ? "default" : "secondary"}>
                        {item.type}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Clock className="size-3" />
                        {item.time}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-950">{item.title}</h3>
                    {item.location ? (
                      <p className="mt-1 text-sm font-medium text-cyan-800">{item.location}</p>
                    ) : null}
                    {item.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Programa ainda não publicado" />
      )}
      <CourseDiagram />
    </SectionShell>
  );
}

function CourseDiagram({
  dark = false,
  details = true,
}: {
  dark?: boolean;
  details?: boolean;
}) {
  const figure = (
      <figure
        className={cn(
          "overflow-hidden rounded-lg border p-4",
          dark ? "border-white/15 bg-white text-slate-950" : "border-slate-200 bg-slate-50",
        )}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-red-600">
              Anexo A2
            </p>
            <h3 className="text-xl font-black uppercase tracking-normal text-slate-950">
              Barlavento/Sotavento
            </h3>
          </div>
          <Badge variant="secondary">Campo 1</Badge>
        </div>
        <img
          src={courseDiagramUrl}
          alt="Anexo A2, esquema do percurso Barlavento/Sotavento com vento, marcas 1, 2, 3S, 3P, saída e chegada."
          className="mx-auto max-h-[560px] w-full rounded-md bg-white object-contain"
        />
      </figure>
  );

  if (!details) {
    return figure;
  }

  return (
    <div
      className={cn(
        "mt-6 grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]",
        dark && "text-white",
      )}
    >
      {figure}
      <div
        className={cn(
          "rounded-lg border p-5",
          dark ? "border-white/15 bg-white/10" : "border-slate-200 bg-white",
        )}
      >
        <p className={cn("text-xs font-bold uppercase tracking-normal", dark ? "text-cyan-200" : "text-cyan-700")}>
          Percurso de prova
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-normal">
          Largada, subida ao vento, porta e chegada
        </h3>
        <div className={cn("mt-5 grid gap-3 text-sm", dark ? "text-sky-50" : "text-slate-700")}>
          {[
            ["Saída", "Linha de largada no sotavento."],
            ["Marcas 1 e 2", "Subida ao vento e offset no topo."],
            ["Porta 3S / 3P", "Descida para a porta de sotavento."],
            ["Chegada", "Linha de chegada após a última perna."],
          ].map(([label, value]) => (
            <div
              key={label}
              className={cn(
                "rounded-lg border px-4 py-3",
                dark ? "border-white/15 bg-sky-950/60" : "border-slate-200 bg-slate-50",
              )}
            >
              <p className="font-black uppercase tracking-normal">{label}</p>
              <p className={cn("mt-1", dark ? "text-sky-100" : "text-slate-600")}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OfficialBoardSection({ notices }: { notices: Notice[] }) {
  return (
    <SectionShell id="quadro-oficial" eyebrow="Quadro oficial" title="Avisos e documentos" dark>
      {notices.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {notices.map((notice) => (
            <Card key={notice.id} className="rounded-lg bg-white text-slate-950">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn(notice.priority === "urgente" && "bg-amber-300 text-slate-950")}>
                    {notice.priority}
                  </Badge>
                  <Badge variant="secondary">{notice.category}</Badge>
                  <span className="text-xs text-slate-500">{formatDateTime(notice.publishedAt)}</span>
                </div>
                <CardTitle className="text-xl">{notice.title}</CardTitle>
                <CardDescription>{notice.body}</CardDescription>
              </CardHeader>
              {notice.attachmentUrl ? (
                <CardContent>
                  <a
                    href={notice.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-950 px-3 py-2 text-sm font-bold text-white"
                  >
                    <Download className="size-4" />
                    {notice.attachmentName || "Abrir documento"}
                  </a>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Sem avisos publicados" dark />
      )}
    </SectionShell>
  );
}

function EntriesSection({
  entries,
  classLabels,
}: {
  entries: Entry[];
  classLabels: Record<string, string>;
}) {
  const grouped = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    acc[entry.classCode] ??= [];
    acc[entry.classCode].push(entry);
    return acc;
  }, {});

  return (
    <SectionShell id="inscritos" eyebrow="Inscritos aprovados" title="Frota ORC A/B">
      {entries.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Object.entries(grouped).map(([classCode, classEntries]) => (
            <Card key={classCode} className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-2xl">{classLabels[classCode] ?? classCode}</CardTitle>
                <CardDescription>{classEntries.length} barcos aprovados</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barco</TableHead>
                      <TableHead>Nº vela</TableHead>
                      <TableHead>Certificado ORC</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-bold">{entry.boatName}</div>
                          <div className="text-xs text-slate-500">
                            {entry.clubName} · {entry.skipper}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{entry.sailNumber}</TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-bold">
                            {entry.certificateRef ?? "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {entry.certificateClassName ?? "Certificado por associar"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <span className="font-semibold">GPH</span>{" "}
                            <span className="font-mono">{formatRating(entry.gph, 1)}</span>
                          </div>
                          <div>
                            <span className="font-semibold">ToT</span>{" "}
                            <span className="font-mono">
                              {formatRating(entry.totInshore)} / {formatRating(entry.totOffshore)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Lista de inscritos ainda não disponível" />
      )}
    </SectionShell>
  );
}

function ResultsSection({ results }: { results: ResultSnapshot[] }) {
  return (
    <SectionShell id="resultados" eyebrow="Resultados publicados" title="Classificações">
      {results.length ? (
        <div className="space-y-5">
          {results.map((snapshot) => (
            <Card key={snapshot.id} className="rounded-lg">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{snapshot.className}</Badge>
                  <Badge variant="secondary">{snapshot.scope}</Badge>
                  <span className="text-xs text-slate-500">{formatDateTime(snapshot.publishedAt)}</span>
                </div>
                <CardTitle className="text-2xl">{snapshot.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos.</TableHead>
                      <TableHead>Barco</TableHead>
                      <TableHead>Tempo real</TableHead>
                      <TableHead>Corrigido</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Regatas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.rows.map((row) => {
                      const rowKey = `${snapshot.id}-${row.rank}-${row.sailNumber}`;
                      return (
                        <Fragment key={rowKey}>
                          <TableRow>
                            <TableCell className="font-black">{row.rank}</TableCell>
                            <TableCell>
                              <div className="font-bold">{row.boatName}</div>
                              <div className="text-xs text-slate-500">
                                {row.sailNumber} · {row.clubName}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold">
                              {formatDuration(row.elapsedSeconds)}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold">
                              {formatDuration(row.correctedSeconds)}
                            </TableCell>
                            <TableCell className="font-mono font-black">{row.points}</TableCell>
                            <TableCell>{row.raceScores.join(" / ")}</TableCell>
                          </TableRow>
                          {row.note ? (
                            <TableRow>
                              <TableCell />
                              <TableCell colSpan={5} className="text-xs text-slate-500">
                                {row.note}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Resultados ainda não publicados" />
      )}
    </SectionShell>
  );
}

function TrackingSection({ data }: { data: PortalData }) {
  return (
    <SectionShell id="tracking" eyebrow="Experiência central" title="Tracking demo" dark>
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,.42fr)_minmax(0,.58fr)]">
        <CourseDiagram dark details={false} />
        <div className="overflow-hidden rounded-lg border border-white/15 shadow-2xl">
          <TrackingMap demo={data.trackingDemo} styleUrl={data.settings.mapStyleUrl} />
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-sky-100">
        Esta área é uma simulação visual para a v1. Não substitui avisos, resultados ou decisões
        oficiais do comité.
      </p>
    </SectionShell>
  );
}

function NewsSection({ posts }: { posts: NewsPost[] }) {
  return (
    <SectionShell id="noticias" eyebrow="Notícias" title="Comunicados e resumos">
      {posts.length ? (
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="h-52 w-full object-cover" />
              ) : null}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  {post.featured ? <Badge>Destaque</Badge> : null}
                  <span className="text-xs text-slate-500">{formatDateTime(post.publishedAt)}</span>
                </div>
                <h3 className="mt-3 text-xl font-black">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Notícias ainda não publicadas" />
      )}
    </SectionShell>
  );
}

function MediaSection({
  media,
  facebookUrl,
}: {
  media: PortalData["media"];
  facebookUrl?: string | null;
}) {
  return (
    <SectionShell id="media" eyebrow="Media" title="Galeria de barcos">
      {media.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <a
              key={item.id}
              href={item.sourceUrl || item.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-lg bg-slate-950 text-white"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                onError={(event) => {
                  event.currentTarget.src = defaultPortalData.settings.heroImageUrl;
                }}
              />
              <div className="p-4">
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1 text-xs text-sky-100">{item.credit || "Fonte Facebook"}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState title="Galeria ainda não publicada" />
      )}
      {facebookUrl ? (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-950 px-4 py-2 text-sm font-bold text-white"
        >
          <ExternalLink className="size-4" />
          Ver página Facebook
        </a>
      ) : null}
    </SectionShell>
  );
}

function CommitteeSection({ data }: { data: PortalData }) {
  return (
    <SectionShell id="comite" eyebrow="Organização" title="Comité e contactos">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{data.event.organizer}</CardTitle>
            <CardDescription>
              Organização do {data.event.name}, {data.event.venueName}, {data.event.courseArea}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="Local" value={data.event.venueName} icon={MapPin} />
            <InfoTile label="Cidade" value={data.event.venueCity} icon={Anchor} />
            <InfoTile label="Campo" value={data.event.courseArea} icon={Radio} />
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {data.event.committee.length ? (
            data.event.committee.map((member) => (
              <div key={`${member.name}-${member.role}`} className="rounded-lg border border-slate-200 p-4">
                <p className="font-bold">{member.name}</p>
                <p className="text-sm text-slate-600">{member.role}</p>
              </div>
            ))
          ) : (
            <EmptyState title="Comité a publicar" />
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <Icon className="mb-3 size-5 text-cyan-700" />
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-8 text-center", dark ? "border-white/15 text-sky-100" : "border-slate-200 text-slate-600")}>
      <FileText className="mx-auto mb-3 size-8 opacity-60" />
      <p className="font-semibold">{title}</p>
    </div>
  );
}

function Footer({ data }: { data: PortalData }) {
  return (
    <footer className="bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-black uppercase tracking-normal">{data.event.name}</p>
          <p className="mt-1 text-sm text-slate-300">
            {data.event.organizer} · {data.event.venueCity} · {data.event.courseArea}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quadro-oficial" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
            Quadro Oficial
          </Link>
          <Link href="/admin" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
