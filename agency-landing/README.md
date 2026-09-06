# Back-Up — Agency Landing Page

A simple, self-contained landing page for the **Back-Up** social media
agency. Plain HTML/CSS/JS — no build step, no dependencies, and completely
separate from the CRM app in the rest of this repo.

## Structure

```
agency-landing/
  index.html    Page markup (hero, services, results, contact)
  styles.css    All styling (bold/colorful gradient theme)
  script.js     Mobile nav toggle, footer year, scroll-reveal
```

## Run it locally

Just open `index.html` in a browser, or serve the folder:

```bash
cd agency-landing
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy it

Since it's static, you can drop this folder into any static host:

- **Cloudflare Pages / Netlify / Vercel**: set the project root to
  `agency-landing/` (or copy its contents to a new repo), no build command
  needed, output directory is `.`
- **GitHub Pages**: enable Pages on this repo pointed at this folder (or
  copy it into its own repo's root).

## Before you launch — placeholders to swap

- **Contact email**: replace `YOUR_EMAIL@example.com` in `index.html`
  (appears twice — the form's `action` and the footer "Email" link). The
  contact form currently submits via a plain `mailto:` link (opens the
  visitor's email client) — swap it for a form service like
  [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com)
  if you want submissions to land somewhere without opening email.
- **Social links**: update the Instagram/TikTok/LinkedIn URLs in the
  contact section.
- **Testimonial**: replace the placeholder quote and name once you have a
  real client testimonial.
- **"Trusted by" strip**: replace the placeholder brand names with real
  client names/logos once you have permission to display them.
- **Stats**: the numbers (150+ brands, 10M+ followers, etc.) are
  placeholders — swap in your real figures.
