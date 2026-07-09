# Campeonato de Portugal ORC 2026

Portal público em português para o Campeonato de Portugal ORC 2026, organizado pela AVELAS na Marina da Figueira da Foz.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Convex para dados e storage
- Clerk para autenticação do admin
- MapLibre para tracking demo

## Desenvolvimento

```bash
npm install
npm run dev
```

O site funciona com dados demonstrativos sem variáveis de ambiente. Para ligar dados reais:

```bash
cp .env.example .env.local
```

Preencher:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `PORTAL_ADMIN_EMAILS`
- `PORTAL_EDITOR_EMAILS`
- `NEXT_PUBLIC_MAPBOX_API_KEY`
- `NEXT_PUBLIC_MAPBOX_STYLE_ID` ou `NEXT_PUBLIC_MAP_STYLE_URL`

## Rotas

- `/` portal completo
- `/programa`
- `/quadro-oficial`
- `/inscritos`
- `/resultados`
- `/tracking`
- `/noticias`
- `/media`
- `/comite`
- `/admin`

## Validação

```bash
npm run lint
npm run build
```

O tracking usa Mapbox quando `NEXT_PUBLIC_MAPBOX_API_KEY` está definido e cai para o mapa alternativo configurado quando não houver token. As imagens do Facebook são guardadas como URLs curadas no admin; o fallback visual é temporário e deve ser substituído por imagens aprovadas do evento.

## Importar Barcos Do Projeto Leme

O portal pode sincronizar barcos vindos do deployment Convex
`trustworthy-magpie-581`, tabela `boats`. Os `classCode` antigos são mapeados
para as classes canónicas do portal: `ORC1`/`ORC_A` para `ORC_A` e
`ORC2`/`ORC_B` para `ORC_B`.

A mutation `imports:importCompetitionBoats` cria/atualiza a regata, classes,
frotas, certificados, clubes e inscrições aprovadas sem reutilizar IDs remotos.
Para executar via CLI sem sessão Clerk, defina `BOAT_IMPORT_TOKEN` no deployment
Convex e passe o mesmo token nos argumentos da mutation.
