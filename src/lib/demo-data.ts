import { defaultMapStyleUrl, EVENT_SLUG } from "@/lib/runtime-config";
import type { PortalData } from "@/lib/portal-types";

const heroImage =
  "https://images.unsplash.com/photo-1631995037903-c4f8064c48ae?auto=format&fit=crop&w=2200&q=82";

const raceDays = ["2026-07-11", "2026-07-12", "2026-07-13", "2026-07-14"];
const dailyRaceTimes = ["12:00", "14:30", "17:00"];

const championshipRaceSchedule = raceDays.flatMap((date, dayIndex) =>
  dailyRaceTimes.map((time, slotIndex) => {
    const raceNumber = dayIndex * dailyRaceTimes.length + slotIndex + 1;
    return {
      id: `schedule-race-${raceNumber}`,
      date,
      time,
      title: `Prova ${raceNumber} - largada prevista`,
      type: "regata" as const,
      location: "Campo 1",
      description:
        "Prova pontuável ORC na janela diária 12:00-18:00, sujeita a confirmação do comité.",
      highlight: slotIndex === 0,
    };
  }),
);

const demoEntries = [
  {
    id: "entry-a-1",
    boatName: "Atlântico",
    classCode: "ORC_A",
    className: "ORC A",
    sailNumber: "POR 101",
    skipper: "Skipper A",
    clubName: "AVELAS",
    crew: ["Tripulação A", "Tripulação B"],
    certificateRef: "ORC-DEMO-A",
  },
  {
    id: "entry-a-2",
    boatName: "Foz Racing",
    classCode: "ORC_A",
    className: "ORC A",
    sailNumber: "POR 177",
    skipper: "Skipper B",
    clubName: "Clube visitante",
    certificateRef: "ORC-DEMO-B",
  },
  {
    id: "entry-a-3",
    boatName: "Mar Alto",
    classCode: "ORC_A",
    className: "ORC A",
    sailNumber: "POR 208",
    skipper: "Skipper D",
    clubName: "Clube visitante",
    certificateRef: "ORC-DEMO-D",
  },
  {
    id: "entry-a-4",
    boatName: "Nortada",
    classCode: "ORC_A",
    className: "ORC A",
    sailNumber: "POR 302",
    skipper: "Skipper E",
    clubName: "AVELAS",
    certificateRef: "ORC-DEMO-E",
  },
  {
    id: "entry-b-1",
    boatName: "Mondego",
    classCode: "ORC_B",
    className: "ORC B",
    sailNumber: "POR 224",
    skipper: "Skipper C",
    clubName: "AVELAS",
    certificateRef: "ORC-DEMO-C",
  },
  {
    id: "entry-b-2",
    boatName: "Barlavento",
    classCode: "ORC_B",
    className: "ORC B",
    sailNumber: "POR 241",
    skipper: "Skipper F",
    clubName: "Clube visitante",
    certificateRef: "ORC-DEMO-F",
  },
  {
    id: "entry-b-3",
    boatName: "Figueira",
    classCode: "ORC_B",
    className: "ORC B",
    sailNumber: "POR 288",
    skipper: "Skipper G",
    clubName: "AVELAS",
    certificateRef: "ORC-DEMO-G",
  },
  {
    id: "entry-b-4",
    boatName: "Ria",
    classCode: "ORC_B",
    className: "ORC B",
    sailNumber: "POR 319",
    skipper: "Skipper H",
    clubName: "Clube visitante",
    certificateRef: "ORC-DEMO-H",
  },
] satisfies PortalData["entries"];

type DemoEntry = (typeof demoEntries)[number];
type DemoCompetitor = DemoEntry & {
  correctedBase: number;
  elapsedBase: number;
  scores: number[];
};

const orcACompetitors: DemoCompetitor[] = [
  {
    ...demoEntries[0],
    elapsedBase: 4380,
    correctedBase: 4210,
    scores: [1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3],
  },
  {
    ...demoEntries[1],
    elapsedBase: 4415,
    correctedBase: 4240,
    scores: [2, 1, 4, 1, 3, 4, 1, 3, 2, 1, 3, 2],
  },
  {
    ...demoEntries[2],
    elapsedBase: 4440,
    correctedBase: 4185,
    scores: [3, 2, 1, 3, 2, 1, 4, 2, 1, 4, 2, 1],
  },
  {
    ...demoEntries[3],
    elapsedBase: 4505,
    correctedBase: 4305,
    scores: [4, 4, 3, 2, 4, 3, 2, 4, 3, 3, 4, 4],
  },
];

const orcBCompetitors: DemoCompetitor[] = [
  {
    ...demoEntries[4],
    elapsedBase: 4690,
    correctedBase: 4470,
    scores: [2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2],
  },
  {
    ...demoEntries[5],
    elapsedBase: 4710,
    correctedBase: 4500,
    scores: [1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3],
  },
  {
    ...demoEntries[6],
    elapsedBase: 4735,
    correctedBase: 4465,
    scores: [3, 2, 1, 3, 3, 1, 4, 2, 1, 4, 2, 1],
  },
  {
    ...demoEntries[7],
    elapsedBase: 4790,
    correctedBase: 4555,
    scores: [4, 4, 4, 2, 2, 4, 3, 4, 3, 3, 3, 4],
  },
];

function racePublishedAt(raceNumber: number) {
  const day = raceDays[Math.floor((raceNumber - 1) / dailyRaceTimes.length)];
  return `${day}T18:30:00.000Z`;
}

function sumScores(scores: number[]) {
  return scores.reduce((total, score) => total + score, 0);
}

function scoreWithDiscard(scores: number[]) {
  return sumScores(scores) - Math.max(...scores);
}

function raceRows(competitors: DemoCompetitor[], raceNumber: number) {
  const winner = competitors.find((boat) => boat.scores[raceNumber - 1] === 1);
  return [...competitors]
    .sort((a, b) => a.scores[raceNumber - 1] - b.scores[raceNumber - 1])
    .map((entry, index) => {
      const rank = entry.scores[raceNumber - 1];
      const correctedSeconds = entry.correctedBase + raceNumber * 64 + (rank - 1) * 58;
      return {
        rank,
        boatName: entry.boatName,
        sailNumber: entry.sailNumber,
        skipper: entry.skipper,
        clubName: entry.clubName,
        elapsedSeconds: correctedSeconds + 180 + index * 17,
        correctedSeconds,
        points: rank,
        raceScores: [String(rank)],
        note: index === 0 ? `Vencedor da prova: ${winner?.boatName ?? entry.boatName}.` : undefined,
      };
    });
}

function generalRows(competitors: DemoCompetitor[]) {
  return [...competitors]
    .sort((a, b) => scoreWithDiscard(a.scores) - scoreWithDiscard(b.scores))
    .map((entry, index) => ({
      rank: index + 1,
      boatName: entry.boatName,
      sailNumber: entry.sailNumber,
      skipper: entry.skipper,
      clubName: entry.clubName,
      points: scoreWithDiscard(entry.scores),
      raceScores: entry.scores.map(String),
      note: `Total ${sumScores(entry.scores)} pts; descarte aplicado: ${Math.max(...entry.scores)} pts.`,
    }));
}

function buildDemoResults() {
  const raceResults = Array.from({ length: 12 }, (_, index) => {
    const raceNumber = index + 1;
    return [
      {
        id: `result-race-${raceNumber}-a`,
        title: `Prova ${raceNumber} - tempos simulados`,
        classCode: "ORC_A",
        className: "ORC A",
        scope: "regata" as const,
        raceNumber,
        publishedAt: racePublishedAt(raceNumber),
        rows: raceRows(orcACompetitors, raceNumber),
      },
      {
        id: `result-race-${raceNumber}-b`,
        title: `Prova ${raceNumber} - tempos simulados`,
        classCode: "ORC_B",
        className: "ORC B",
        scope: "regata" as const,
        raceNumber,
        publishedAt: racePublishedAt(raceNumber),
        rows: raceRows(orcBCompetitors, raceNumber),
      },
    ];
  }).flat();

  return [
    {
      id: "result-general-a",
      title: "Classificação geral provisória - 12 provas",
      classCode: "ORC_A",
      className: "ORC A",
      scope: "geral" as const,
      publishedAt: "2026-07-14T19:00:00.000Z",
      rows: generalRows(orcACompetitors),
    },
    {
      id: "result-general-b",
      title: "Classificação geral provisória - 12 provas",
      classCode: "ORC_B",
      className: "ORC B",
      scope: "geral" as const,
      publishedAt: "2026-07-14T19:00:00.000Z",
      rows: generalRows(orcBCompetitors),
    },
    ...raceResults.reverse(),
  ];
}

export const defaultPortalData: PortalData = {
  event: {
    slug: EVENT_SLUG,
    name: "Campeonato de Portugal ORC 2026",
    organizer: "AVELAS",
    level: "Campeonato de Portugal",
    startDate: "2026-07-11",
    endDate: "2026-07-14",
    venueName: "Marina da Figueira da Foz",
    venueCity: "Figueira da Foz",
    courseArea: "Campo 1",
    committee: [
      { name: "Comissão de Regatas", role: "Gestão de prova" },
      { name: "Comité Técnico", role: "Medições e certificados ORC" },
      { name: "Júri", role: "Protestos e decisões" },
    ],
  },
  settings: {
    heroTitle: "Campeonato de Portugal ORC 2026",
    heroSubtitle:
      "Quatro dias de competição costeira, ranking ORC A/B e quadro oficial em tempo real na Figueira da Foz.",
    heroImageUrl: heroImage,
    heroCredit:
      "Imagem demonstrativa: John Bell / Unsplash. Substituir por foto aprovada do Facebook.",
    registrationUrl: "mailto:secretaria@avelas.pt?subject=Inscricao ORC 2026",
    facebookPageUrl:
      "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
    mapStyleUrl: defaultMapStyleUrl,
    urgentEnabled: true,
    urgentMessage:
      "Portal em modo de lançamento: confirme sempre decisões oficiais no Quadro Oficial de Avisos.",
    urgentHref: "/quadro-oficial",
    partners: [
      { name: "AVELAS" },
      { name: "Marina da Figueira da Foz" },
      { name: "ORC Portugal" },
    ],
  },
  classLabels: {
    ORC_A: "ORC A",
    ORC_B: "ORC B",
  },
  schedule: [
    {
      id: "schedule-1",
      date: "2026-07-11",
      time: "09:00",
      title: "Abertura do secretariado",
      type: "comite",
      location: "Marina da Figueira da Foz",
      description: "Confirmação de presença, documentação e acreditações.",
      highlight: true,
    },
    ...championshipRaceSchedule,
    {
      id: "schedule-5",
      date: "2026-07-14",
      time: "18:30",
      title: "Cerimónia de entrega de prémios",
      type: "cerimonia",
      location: "AVELAS",
      description: "Entrega de prémios após publicação de resultados finais.",
      highlight: true,
    },
  ],
  notices: [
    {
      id: "notice-1",
      title: "Quadro Oficial de Avisos aberto",
      body: "Os avisos, alterações, protestos, decisões e resultados oficiais serão publicados nesta área.",
      category: "aviso",
      priority: "importante",
      publishedAt: "2026-07-08T17:00:00.000Z",
    },
    {
      id: "notice-2",
      title: "Documentação base em preparação",
      body: "Anúncio de regata e instruções de regata serão adicionados em PDF pelo comité.",
      category: "anuncio",
      priority: "normal",
      publishedAt: "2026-07-08T17:30:00.000Z",
    },
  ],
  entries: demoEntries,
  results: buildDemoResults(),
  news: [
    {
      id: "news-1",
      slug: "portal-lancamento",
      title: "Figueira da Foz recebe a frota ORC nacional",
      excerpt:
        "O campeonato reúne a frota ORC A/B numa semana decisiva para o ranking nacional.",
      body: "A AVELAS prepara quatro dias de competição no Campo 1, com quadro oficial digital e acompanhamento visual da prova.",
      imageUrl: heroImage,
      imageCredit: "John Bell / Unsplash",
      publishedAt: "2026-07-08T18:00:00.000Z",
      featured: true,
    },
  ],
  media: [
    {
      id: "media-1",
      title: "Galeria oficial Facebook",
      imageUrl: heroImage,
      sourceUrl:
        "https://www.facebook.com/p/Campeonato-de-Portugal-ORC-100063607089210",
      credit: "Facebook Campeonato de Portugal ORC",
      featured: true,
    },
  ],
  trackingDemo: {
    id: "tracking-demo-1",
    title: "Replay visual Campo 1",
    updatedAt: Date.UTC(2026, 6, 8, 18, 0, 0),
    frames: [
      {
        second: 0,
        positions: [
          {
            entryId: "entry-a-1",
            label: "Atlântico",
            classCode: "ORC_A",
            sailNumber: "POR 101",
            lng: -8.912,
            lat: 40.145,
            sog: 6.4,
            heading: 240,
          },
          {
            entryId: "entry-a-2",
            label: "Foz Racing",
            classCode: "ORC_A",
            sailNumber: "POR 177",
            lng: -8.905,
            lat: 40.151,
            sog: 6.1,
            heading: 238,
          },
          {
            entryId: "entry-b-1",
            label: "Mondego",
            classCode: "ORC_B",
            sailNumber: "POR 224",
            lng: -8.901,
            lat: 40.139,
            sog: 5.7,
            heading: 235,
          },
        ],
      },
      {
        second: 45,
        positions: [
          {
            entryId: "entry-a-1",
            label: "Atlântico",
            classCode: "ORC_A",
            sailNumber: "POR 101",
            lng: -8.925,
            lat: 40.138,
            sog: 7,
            heading: 255,
          },
          {
            entryId: "entry-a-2",
            label: "Foz Racing",
            classCode: "ORC_A",
            sailNumber: "POR 177",
            lng: -8.918,
            lat: 40.145,
            sog: 6.6,
            heading: 252,
          },
          {
            entryId: "entry-b-1",
            label: "Mondego",
            classCode: "ORC_B",
            sailNumber: "POR 224",
            lng: -8.911,
            lat: 40.133,
            sog: 6,
            heading: 248,
          },
        ],
      },
      {
        second: 90,
        positions: [
          {
            entryId: "entry-a-1",
            label: "Atlântico",
            classCode: "ORC_A",
            sailNumber: "POR 101",
            lng: -8.934,
            lat: 40.151,
            sog: 6.8,
            heading: 20,
          },
          {
            entryId: "entry-a-2",
            label: "Foz Racing",
            classCode: "ORC_A",
            sailNumber: "POR 177",
            lng: -8.928,
            lat: 40.156,
            sog: 6.3,
            heading: 24,
          },
          {
            entryId: "entry-b-1",
            label: "Mondego",
            classCode: "ORC_B",
            sailNumber: "POR 224",
            lng: -8.922,
            lat: 40.146,
            sog: 5.9,
            heading: 16,
          },
        ],
      },
    ],
  },
};
