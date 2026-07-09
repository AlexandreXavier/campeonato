"use client";

import {
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Home,
  Image as ImageIcon,
  ListChecks,
  Megaphone,
  Radio,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { portalApi } from "@/lib/convex-api";
import { defaultPortalData } from "@/lib/demo-data";
import type { PortalData } from "@/lib/portal-types";
import {
  EVENT_SLUG,
  hasClerkConfig,
  hasConvexConfig,
  hasLocalAdminConfig,
} from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

type AdminTab =
  | "home"
  | "avisos"
  | "programa"
  | "noticias"
  | "media"
  | "resultados"
  | "tracking"
  | "roles";

const tabs: Array<{
  value: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "home", label: "Home", icon: Home },
  { value: "avisos", label: "Avisos", icon: Megaphone },
  { value: "programa", label: "Programa", icon: ListChecks },
  { value: "noticias", label: "Notícias", icon: FileUp },
  { value: "media", label: "Media", icon: ImageIcon },
  { value: "resultados", label: "Resultados", icon: Trophy },
  { value: "tracking", label: "Tracking", icon: Radio },
  { value: "roles", label: "Papéis", icon: ShieldCheck },
];

const defaultRowsJson = JSON.stringify(
  [
    {
      rank: 1,
      boatName: "Atlântico",
      sailNumber: "POR 101",
      skipper: "Skipper A",
      clubName: "AVELAS",
      points: 1,
      raceScores: ["1"],
    },
  ],
  null,
  2,
);

const defaultTrackingJson = JSON.stringify(defaultPortalData.trackingDemo.frames, null, 2);

function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formBoolean(form: FormData, key: string) {
  return form.get(key) === "on";
}

function portalFromDashboard(dashboard: unknown): PortalData {
  const data = dashboard as { portal?: PortalData | null } | undefined;
  return data?.portal ?? defaultPortalData;
}

export function AdminConsole() {
  if (!hasConvexConfig || (!hasClerkConfig && !hasLocalAdminConfig)) {
    return <SetupPanel />;
  }

  if (!hasClerkConfig && hasLocalAdminConfig) {
    return <LocalAdminConsole />;
  }

  return <ConfiguredAdminConsole />;
}

function LocalAdminConsole() {
  const [activeTab, setActiveTab] = useState<AdminTab>("home");
  const [message, setMessage] = useState<string | null>(null);
  const dashboard = useQuery(portalApi.getAdminDashboard, { slug: EVENT_SLUG });
  const portal = useMemo(() => portalFromDashboard(dashboard), [dashboard]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-cyan-200">
              Administração local
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase">Portal ORC 2026</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-300 text-slate-950 hover:bg-cyan-300">
              Modo local
            </Badge>
            <LocalUserStatus dashboard={dashboard} />
          </div>
        </div>
      </header>
      <AdminBody
        activeTab={activeTab}
        dashboard={dashboard}
        message={message}
        portal={portal}
        setActiveTab={setActiveTab}
        setMessage={setMessage}
      />
    </div>
  );
}

function ConfiguredAdminConsole() {
  const [activeTab, setActiveTab] = useState<AdminTab>("home");
  const [message, setMessage] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useUser();
  const dashboard = useQuery(
    portalApi.getAdminDashboard,
    hasConvexConfig ? { slug: EVENT_SLUG } : "skip",
  );
  const portal = useMemo(() => portalFromDashboard(dashboard), [dashboard]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-cyan-200">
              Administração
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase">Portal ORC 2026</h1>
          </div>
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <UserStatus dashboard={dashboard} />
              <UserButton />
            </div>
          ) : null}
        </div>
      </header>

      {!isLoaded ? (
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <ShieldCheck className="mb-4 size-12 text-cyan-200" />
          <h2 className="text-3xl font-black">A preparar sessão</h2>
          <p className="mt-3 text-slate-300">A validar autenticação Clerk.</p>
        </main>
      ) : null}

      {isLoaded && !isSignedIn ? (
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <ShieldCheck className="mb-4 size-12 text-cyan-200" />
          <h2 className="text-3xl font-black">Entrada protegida</h2>
          <p className="mt-3 text-slate-300">
            Inicia sessão com um email autorizado para editar conteúdos do portal.
          </p>
          <SignInButton mode="modal">
            <Button className="mt-6 bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Entrar no admin
          </Button>
        </SignInButton>
      </main>
      ) : null}

      {isSignedIn ? (
        <AdminBody
          activeTab={activeTab}
          dashboard={dashboard}
          message={message}
          portal={portal}
          setActiveTab={setActiveTab}
          setMessage={setMessage}
        />
      ) : null}
    </div>
  );
}

function UserStatus({ dashboard }: { dashboard: unknown }) {
  const { user } = useUser();
  const data = dashboard as
    | { status?: string; user?: { role?: string; email?: string | null } | null }
    | undefined;
  return (
    <div className="text-right text-xs">
      <p className="font-bold">{user?.primaryEmailAddress?.emailAddress}</p>
      <p className="text-cyan-200">{data?.user?.role ?? data?.status ?? "a carregar"}</p>
    </div>
  );
}

function LocalUserStatus({ dashboard }: { dashboard: unknown }) {
  const data = dashboard as
    | { status?: string; user?: { role?: string; email?: string | null } | null }
    | undefined;
  return (
    <div className="text-right text-xs">
      <p className="font-bold">{data?.user?.email ?? "local-admin@avelas.local"}</p>
      <p className="text-cyan-200">{data?.user?.role ?? data?.status ?? "a carregar"}</p>
    </div>
  );
}

function AdminBody({
  activeTab,
  dashboard,
  message,
  portal,
  setActiveTab,
  setMessage,
}: {
  activeTab: AdminTab;
  dashboard: unknown;
  message: string | null;
  portal: PortalData;
  setActiveTab: (tab: AdminTab) => void;
  setMessage: (message: string | null) => void;
}) {
  const syncCurrentUser = useMutation(portalApi.syncCurrentUser);
  const data = dashboard as
    | { status?: string; user?: { role?: string; email?: string | null } | null }
    | undefined;
  const role = data?.user?.role;
  const canEdit = role === "admin" || role === "editor";

  if (dashboard === undefined) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <ShieldCheck className="mb-4 size-12 text-cyan-200" />
        <h2 className="text-3xl font-black">A carregar Convex</h2>
        <p className="mt-3 text-slate-300">A preparar dados do painel admin.</p>
      </main>
    );
  }

  if (data?.status === "needsSync" || !data?.user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-amber-300" />
        <h2 className="text-3xl font-black">Utilizador ainda não sincronizado</h2>
        <p className="mt-3 text-slate-300">
          Sincroniza o utilizador admin para a tabela `users` da Convex.
        </p>
        <Button
          className="mt-6 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          onClick={async () => {
            await syncCurrentUser({});
            setMessage("Utilizador sincronizado. Recarrega se o papel ainda não aparecer.");
          }}
        >
          Sincronizar utilizador
        </Button>
      </main>
    );
  }

  if (!canEdit) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto mb-4 size-12 text-slate-400" />
        <h2 className="text-3xl font-black">Sem permissões de edição</h2>
        <p className="mt-3 text-slate-300">
          O teu utilizador existe, mas ainda não tem papel `admin` ou `editor`.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-lg border border-white/10 bg-white/5 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10",
                activeTab === tab.value && "bg-cyan-300 text-slate-950 hover:bg-cyan-300",
              )}
              onClick={() => setActiveTab(tab.value)}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </aside>

      <section className="space-y-4">
        {message ? (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            <CheckCircle2 className="size-4" />
            {message}
          </div>
        ) : null}
        <AdminTabPanel tab={activeTab} portal={portal} role={role} setMessage={setMessage} />
      </section>
    </main>
  );
}

function AdminTabPanel({
  tab,
  portal,
  role,
  setMessage,
}: {
  tab: AdminTab;
  portal: PortalData;
  role?: string;
  setMessage: (message: string | null) => void;
}) {
  switch (tab) {
    case "home":
      return <HomeForm portal={portal} setMessage={setMessage} />;
    case "avisos":
      return <NoticeForm setMessage={setMessage} />;
    case "programa":
      return <ScheduleForm setMessage={setMessage} />;
    case "noticias":
      return <NewsForm setMessage={setMessage} />;
    case "media":
      return <MediaForm setMessage={setMessage} />;
    case "resultados":
      return <ResultForm setMessage={setMessage} />;
    case "tracking":
      return <TrackingForm setMessage={setMessage} />;
    case "roles":
      return <RolesForm disabled={role !== "admin"} setMessage={setMessage} />;
    default:
      return null;
  }
}

function AdminCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg bg-white text-slate-950">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </div>
  );
}

function HomeForm({
  portal,
  setMessage,
}: {
  portal: PortalData;
  setMessage: (message: string | null) => void;
}) {
  const upsert = useMutation(portalApi.upsertSiteSettings);
  return (
    <AdminCard
      title="Home e identidade"
      description="Atualiza hero, links, Facebook, mapa e banner urgente."
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await upsert({
            slug: EVENT_SLUG,
            heroTitle: formValue(form, "heroTitle"),
            heroSubtitle: formValue(form, "heroSubtitle"),
            heroImageUrl: formValue(form, "heroImageUrl"),
            heroCredit: formValue(form, "heroCredit"),
            registrationUrl: formValue(form, "registrationUrl"),
            facebookPageUrl: formValue(form, "facebookPageUrl"),
            mapStyleUrl: formValue(form, "mapStyleUrl"),
            urgentEnabled: formBoolean(form, "urgentEnabled"),
            urgentMessage: formValue(form, "urgentMessage"),
            urgentHref: formValue(form, "urgentHref"),
          });
          setMessage("Home atualizada e publicada.");
        }}
      >
        <Field label="Título hero" name="heroTitle" defaultValue={portal.settings.heroTitle} />
        <Field label="Subtítulo hero" name="heroSubtitle" defaultValue={portal.settings.heroSubtitle} />
        <Field label="URL imagem hero/Facebook" name="heroImageUrl" defaultValue={portal.settings.heroImageUrl} />
        <Field label="Crédito da imagem" name="heroCredit" defaultValue={portal.settings.heroCredit} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="URL inscrição externa" name="registrationUrl" defaultValue={portal.settings.registrationUrl} />
          <Field label="URL Facebook" name="facebookPageUrl" defaultValue={portal.settings.facebookPageUrl} />
        </div>
        <Field label="Map style URL" name="mapStyleUrl" defaultValue={portal.settings.mapStyleUrl} />
        <div className="rounded-lg border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input name="urgentEnabled" type="checkbox" defaultChecked={portal.settings.urgentEnabled} />
            Ativar banner urgente
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Mensagem urgente" name="urgentMessage" defaultValue={portal.settings.urgentMessage} />
            <Field label="Link do banner" name="urgentHref" defaultValue={portal.settings.urgentHref} />
          </div>
        </div>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Guardar e publicar
        </Button>
      </form>
    </AdminCard>
  );
}

function NoticeForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const saveNotice = useMutation(portalApi.saveNotice);
  const generateUploadUrl = useMutation(portalApi.generateNoticeUploadUrl);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    let attachmentStorageId: string | undefined;
    let attachmentName: string | undefined;

    if (file instanceof File && file.size > 0) {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl as string, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const json = (await result.json()) as { storageId: string };
      attachmentStorageId = json.storageId;
      attachmentName = file.name;
    }

    await saveNotice({
      slug: EVENT_SLUG,
      title: formValue(form, "title") ?? "Aviso",
      body: formValue(form, "body") ?? "",
      category: formValue(form, "category") ?? "aviso",
      priority: formValue(form, "priority") ?? "normal",
      attachmentName,
      attachmentStorageId,
    });
    formElement.reset();
    setMessage("Aviso publicado no Quadro Oficial.");
  }

  return (
    <AdminCard
      title="Quadro Oficial de Avisos"
      description="Publica avisos, decisões, alterações, resultados e documentos oficiais."
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field label="Título" name="title" />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Categoria" name="category" options={["anuncio", "instrucoes", "aviso", "alteracao", "protesto", "decisao", "resultado", "comite"]} />
          <SelectField label="Prioridade" name="priority" options={["normal", "importante", "urgente"]} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Corpo</Label>
          <Textarea id="body" name="body" rows={5} />
        </div>
        <Field label="PDF/documento oficial" name="file" type="file" />
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Publicar aviso
        </Button>
      </form>
    </AdminCard>
  );
}

function ScheduleForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const save = useMutation(portalApi.saveScheduleItem);
  return (
    <AdminCard title="Programa" description="Adiciona horários por dia do campeonato.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await save({
            slug: EVENT_SLUG,
            date: formValue(form, "date") ?? "2026-07-11",
            time: formValue(form, "time") ?? "12:00",
            title: formValue(form, "title") ?? "Atividade",
            type: formValue(form, "type") ?? "outro",
            location: formValue(form, "location"),
            description: formValue(form, "description"),
            highlight: formBoolean(form, "highlight"),
          });
          event.currentTarget.reset();
          setMessage("Item de programa publicado.");
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Data" name="date" type="date" defaultValue="2026-07-11" />
          <Field label="Hora" name="time" type="time" defaultValue="12:00" />
          <SelectField label="Tipo" name="type" options={["regata", "briefing", "social", "cerimonia", "comite", "outro"]} />
        </div>
        <Field label="Título" name="title" />
        <Field label="Local" name="location" />
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input name="highlight" type="checkbox" />
          Destacar
        </label>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Publicar programa
        </Button>
      </form>
    </AdminCard>
  );
}

function NewsForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const save = useMutation(portalApi.saveNewsPost);
  return (
    <AdminCard title="Notícias" description="Publica comunicados e resumos editoriais.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await save({
            slug: EVENT_SLUG,
            postSlug: formValue(form, "postSlug") ?? `noticia-${Date.now()}`,
            title: formValue(form, "title") ?? "Notícia",
            excerpt: formValue(form, "excerpt") ?? "",
            body: formValue(form, "body") ?? "",
            imageUrl: formValue(form, "imageUrl"),
            imageCredit: formValue(form, "imageCredit"),
            featured: formBoolean(form, "featured"),
          });
          event.currentTarget.reset();
          setMessage("Notícia publicada.");
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Slug" name="postSlug" placeholder="resumo-dia-1" />
          <Field label="Título" name="title" />
        </div>
        <Field label="Resumo" name="excerpt" />
        <div className="space-y-2">
          <Label htmlFor="body">Corpo</Label>
          <Textarea id="body" name="body" rows={6} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="URL imagem" name="imageUrl" />
          <Field label="Crédito" name="imageCredit" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input name="featured" type="checkbox" />
          Destaque
        </label>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Publicar notícia
        </Button>
      </form>
    </AdminCard>
  );
}

function MediaForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const save = useMutation(portalApi.saveMediaItem);
  return (
    <AdminCard title="Media" description="Adiciona imagens curadas do Facebook por URL.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await save({
            slug: EVENT_SLUG,
            title: formValue(form, "title") ?? "Imagem",
            imageUrl: formValue(form, "imageUrl") ?? "",
            sourceUrl: formValue(form, "sourceUrl"),
            credit: formValue(form, "credit"),
            featured: formBoolean(form, "featured"),
          });
          event.currentTarget.reset();
          setMessage("Imagem adicionada à galeria.");
        }}
      >
        <Field label="Título" name="title" />
        <Field label="URL direta da imagem" name="imageUrl" />
        <Field label="URL do post/Facebook" name="sourceUrl" />
        <Field label="Crédito" name="credit" />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input name="featured" type="checkbox" />
          Destaque
        </label>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Adicionar media
        </Button>
      </form>
    </AdminCard>
  );
}

function ResultForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const save = useMutation(portalApi.saveResultSnapshot);
  return (
    <AdminCard title="Resultados" description="Publica snapshots estáveis de classificação.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const rows = JSON.parse(formValue(form, "rows") ?? "[]");
          await save({
            slug: EVENT_SLUG,
            title: formValue(form, "title") ?? "Classificação",
            classCode: formValue(form, "classCode") ?? "ORC_A",
            scope: formValue(form, "scope") ?? "geral",
            raceNumber: Number(formValue(form, "raceNumber")) || undefined,
            rows,
          });
          setMessage("Resultado publicado.");
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Título" name="title" defaultValue="Classificação geral" />
          <SelectField label="Classe" name="classCode" options={["ORC_A", "ORC_B"]} />
          <SelectField label="Âmbito" name="scope" options={["geral", "regata"]} />
        </div>
        <Field label="Número da regata (opcional)" name="raceNumber" type="number" />
        <div className="space-y-2">
          <Label htmlFor="rows">Linhas JSON</Label>
          <Textarea id="rows" name="rows" rows={10} defaultValue={defaultRowsJson} className="font-mono text-xs" />
        </div>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Publicar resultado
        </Button>
      </form>
    </AdminCard>
  );
}

function TrackingForm({ setMessage }: { setMessage: (message: string | null) => void }) {
  const save = useMutation(portalApi.saveTrackingDemo);
  const syncFromBoats = useMutation(portalApi.syncEntriesFromBoats);
  return (
    <AdminCard title="Tracking demo" description="Publica frames simulados para a experiência central.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const frames = JSON.parse(formValue(form, "frames") ?? "[]");
          await save({
            slug: EVENT_SLUG,
            title: formValue(form, "title") ?? "Replay visual Campo 1",
            frames,
          });
          setMessage("Tracking demo atualizado.");
        }}
      >
        <Field label="Título" name="title" defaultValue="Replay visual Campo 1" />
        <div className="space-y-2">
          <Label htmlFor="frames">Frames JSON</Label>
          <Textarea id="frames" name="frames" rows={14} defaultValue={defaultTrackingJson} className="font-mono text-xs" />
        </div>
        <Button type="submit" className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Publicar tracking
        </Button>
      </form>
      <div className="mt-6 rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-600">
          Usa a tabela `boats` e os certificados ORC para reconstruir inscritos,
          tracking e resultados simulados.
        </p>
        <Button
          type="button"
          className="mt-4 w-fit bg-cyan-700 text-white hover:bg-cyan-800"
          onClick={async () => {
            const result = (await syncFromBoats({})) as {
              entrySync?: { entriesInserted?: number; entriesUpdated?: number };
              simulation?: { boats?: number; races?: number; snapshots?: number };
            };
            setMessage(
              `Barcos sincronizados: ${result.entrySync?.entriesInserted ?? 0} novas inscrições, ${result.entrySync?.entriesUpdated ?? 0} atualizadas; ${result.simulation?.boats ?? 0} barcos, ${result.simulation?.races ?? 0} provas e ${result.simulation?.snapshots ?? 0} snapshots gerados.`,
            );
          }}
        >
          Sincronizar barcos e gerar demo
        </Button>
      </div>
    </AdminCard>
  );
}

function RolesForm({
  disabled,
  setMessage,
}: {
  disabled: boolean;
  setMessage: (message: string | null) => void;
}) {
  const save = useMutation(portalApi.setUserRole);
  return (
    <AdminCard title="Papéis" description="Promove utilizadores sincronizados para admin/editor.">
      {disabled ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Apenas administradores podem alterar papéis.
        </div>
      ) : null}
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await save({
            email: formValue(form, "email") ?? "",
            role: formValue(form, "role") ?? "editor",
          });
          event.currentTarget.reset();
          setMessage("Papel atualizado.");
        }}
      >
        <Field label="Email" name="email" type="email" />
        <SelectField label="Papel" name="role" options={["admin", "editor", "participante"]} />
        <Button type="submit" disabled={disabled} className="w-fit bg-sky-950 text-white hover:bg-sky-900">
          Atualizar papel
        </Button>
      </form>
    </AdminCard>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SetupPanel() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Badge className="bg-amber-300 text-slate-950 hover:bg-amber-300">
          Configuração necessária
        </Badge>
        <h1 className="mt-4 text-4xl font-black uppercase">Admin ainda não ligado</h1>
        <p className="mt-3 text-slate-300">
          O portal público funciona com dados demonstrativos. Para ativar escrita real,
          configura Convex e Clerk no ambiente local/Vercel, ou ativa o admin local
          apenas para desenvolvimento.
        </p>
        <div className="mt-8 grid gap-4">
          <SetupItem
            ok={hasConvexConfig}
            label="NEXT_PUBLIC_CONVEX_URL"
            description="URL do deployment Convex usado pelo portal."
          />
          <SetupItem
            ok={hasClerkConfig || hasLocalAdminConfig}
            label="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / NEXT_PUBLIC_LOCAL_ADMIN"
            description="Clerk para produção, ou admin local para desenvolvimento."
          />
          <SetupItem
            ok={hasLocalAdminConfig}
            label="CLERK_SECRET_KEY / ENABLE_LOCAL_ADMIN"
            description="JWT Clerk para produção, ou flag Convex local para escrita em desenvolvimento."
          />
          <SetupItem
            ok={false}
            label="PORTAL_ADMIN_EMAILS"
            description="Lista de emails admin separados por vírgula."
          />
        </div>
      </div>
    </main>
  );
}

function SetupItem({
  ok,
  label,
  description,
}: {
  ok: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-5 text-cyan-300" />
        ) : (
          <AlertTriangle className="size-5 text-amber-300" />
        )}
        <p className="font-mono text-sm font-bold">{label}</p>
      </div>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </div>
  );
}
