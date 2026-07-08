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

As imagens do Facebook são guardadas como URLs curadas no admin; o fallback visual é temporário e deve ser substituído por imagens aprovadas do evento.
