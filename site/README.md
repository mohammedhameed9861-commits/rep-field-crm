# Marketing site — Flowercom

Static marketing site for Flowercom — separate from the CRM in this repo,
with **no shared backend, database, or auth**. It exists purely to present
the business and let visitors reach you on WhatsApp; it never writes into
the CRM.

- **Stack**: React + Vite + TypeScript + Tailwind — same tooling as the CRM,
  but a fully independent app (own `package.json`, own build, own deploy).
- **Bilingual**: English + Arabic via `i18next`/`react-i18next`. The language
  switcher in the nav flips text direction (`dir="rtl"`) and swaps the
  heading font to the Arabic display face automatically.
- **Brand assets used**: the real Flowercom logo (`src/assets/logo-*.png`,
  trimmed from the brand kit) and the Arabic display font (`Kaeeb Serif`,
  self-hosted via `@font-face` in `src/index.css`). Colors (purple/teal/cream)
  and fonts (Cinzel + Lato) are pulled from the same brand kit.
- **Hero motion**: no real video yet, so the homepage opens with the
  brand's own hand-drawn botanical line art (leaves/flowers) animated
  drifting/falling behind the hero text — built to be swapped for a real
  video with one line, see below.
- **Content**:
  - Brand/contact config (WhatsApp number, email, phone, address) lives in
    [`src/siteConfig.ts`](./src/siteConfig.ts).
  - All page text lives in [`src/i18n/locales/en.json`](./src/i18n/locales/en.json)
    and [`ar.json`](./src/i18n/locales/ar.json) — edit those to change
    wording in either language.

## Before going live

Still placeholders in `src/siteConfig.ts`, marked `TODO`:

- `whatsapp.number` — **the WhatsApp button is hidden (shown disabled) until
  this is set.** Digits only: country code + number, no `+`, no spaces, no
  leading `0`.
- `contact.phoneDisplay`, `contact.address`, `contact.hours`.

## Swapping in a real hero video

Set `heroVideoSrc` in `src/siteConfig.ts` to a video file path (e.g. put the
file in `public/hero.mp4` and set it to `"/hero.mp4"`). When set, the hero
automatically switches from the animated botanicals to that video with a
dark overlay behind the text — no other code changes needed.

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
