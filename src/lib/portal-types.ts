export type PortalMode =
  | "home"
  | "programa"
  | "quadro"
  | "inscritos"
  | "resultados"
  | "tracking"
  | "noticias"
  | "media"
  | "comite";

export type CommitteeMember = {
  name: string;
  role: string;
};

export type Partner = {
  name: string;
  href?: string | null;
  logoUrl?: string | null;
};

export type PortalSettings = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroCredit?: string | null;
  registrationUrl?: string | null;
  facebookPageUrl?: string | null;
  mapStyleUrl?: string | null;
  urgentEnabled: boolean;
  urgentMessage?: string | null;
  urgentHref?: string | null;
  partners: Partner[];
};

export type PortalEvent = {
  id?: string;
  slug: string;
  name: string;
  organizer: string;
  level: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueCity: string;
  courseArea: string;
  committee: CommitteeMember[];
};

export type ScheduleItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: "regata" | "briefing" | "social" | "cerimonia" | "comite" | "outro";
  location?: string | null;
  description?: string | null;
  highlight?: boolean;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  category:
    | "anuncio"
    | "instrucoes"
    | "aviso"
    | "alteracao"
    | "protesto"
    | "decisao"
    | "resultado"
    | "comite";
  priority: "normal" | "importante" | "urgente";
  publishedAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
};

export type Entry = {
  id: string;
  boatName: string;
  classCode: "ORC_A" | "ORC_B" | string;
  className: string;
  sailNumber: string;
  skipper: string;
  clubName?: string | null;
  crew?: string[];
  certificateRef?: string | null;
  certificateClassName?: string | null;
  certificateIssueDate?: string | null;
  gph?: number | null;
  totInshore?: number | null;
  totOffshore?: number | null;
  aphT?: number | null;
  photoUrl?: string | null;
};

export type ResultRow = {
  rank: number;
  boatName: string;
  sailNumber: string;
  skipper?: string | null;
  clubName?: string | null;
  elapsedSeconds?: number | null;
  correctedSeconds?: number | null;
  points: number;
  raceScores: string[];
  note?: string | null;
};

export type ResultSnapshot = {
  id: string;
  title: string;
  classCode: "ORC_A" | "ORC_B" | string;
  className: string;
  scope: "geral" | "regata";
  raceNumber?: number | null;
  publishedAt: string;
  rows: ResultRow[];
};

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  imageUrl?: string | null;
  imageCredit?: string | null;
  publishedAt: string;
  featured?: boolean;
};

export type MediaItem = {
  id: string;
  title: string;
  imageUrl: string;
  sourceUrl?: string | null;
  credit?: string | null;
  featured?: boolean;
};

export type TrackingPosition = {
  entryId?: string | null;
  label: string;
  classCode: string;
  sailNumber?: string | null;
  lng: number;
  lat: number;
  sog?: number | null;
  heading?: number | null;
};

export type TrackingFrame = {
  second: number;
  positions: TrackingPosition[];
};

export type TrackingDemo = {
  id: string;
  title: string;
  updatedAt: number;
  frames: TrackingFrame[];
};

export type PortalData = {
  event: PortalEvent;
  settings: PortalSettings;
  classLabels: Record<string, string>;
  schedule: ScheduleItem[];
  notices: Notice[];
  entries: Entry[];
  results: ResultSnapshot[];
  news: NewsPost[];
  media: MediaItem[];
  trackingDemo: TrackingDemo;
};
