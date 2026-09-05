# Marketing site

Static marketing site for the flower distribution business — separate from
the CRM in this repo, with **no shared backend, database, or auth**. It
exists purely to present the business and let visitors reach you on
WhatsApp; it never writes into the CRM.

- **Stack**: React + Vite + TypeScript + Tailwind — same tooling as the CRM,
  but a fully independent app (own `package.json`, own build, own deploy).
- **Content**: everything specific to your business (name, tagline, phone
  number, WhatsApp number, categories, stats) lives in one place:
  [`src/siteConfig.ts`](./src/siteConfig.ts). Edit that file to update the
  page — you shouldn't need to touch `App.tsx` for content changes.

## Before going live

Replace the placeholders in `src/siteConfig.ts`, marked `TODO`:

- `whatsapp.number` — your WhatsApp Business number, digits only (country
  code + number, no `+`, no spaces, no leading `0`).
- `contact.email`, `contact.phoneDisplay`, `contact.address`.
- Swap the placeholder business name, categories, and stats for your real
  ones.

## Local development

```bash
npm install
npm run dev
```

## Deploy (Cloudflare Pages)

This is set up the same way as the CRM, as its **own** Cloudflare Pages
project pointed at this subdirectory:

1. Workers & Pages → Create → Pages → Connect to Git → select this repo.
2. Build settings:
   - **Root directory**: `site`
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. No environment variables needed — this app has no backend.
4. Custom domain: point your **root domain** (e.g. `yourdomain.com`) at
   this Pages project. Point `crm.yourdomain.com` at the *other* Pages
   project (the CRM, deployed from the repo root) as its own custom domain.
