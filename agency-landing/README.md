# Backup — Agency Landing Page

A self-contained landing page recreating the real **Backup** (وكالة تسويق
رقمي) site design from screenshots, in Arabic/RTL, dark theme with the
pink→purple brand gradient. Plain HTML/CSS/JS — no build step, no
dependencies, and separate from the CRM app in the rest of this repo.

## Structure

```
agency-landing/
  index.html    Page markup (nav, hero, stats, about, services, clients, CTA, footer)
  styles.css    All styling (dark theme, RTL-aware with logical properties)
  script.js     Mobile nav toggle, footer year, scroll-reveal
```

## Contact number

Every phone/WhatsApp touchpoint on this page uses **+964 773 050 0554**:
- Nav call icon → `tel:+9647730500554`
- WhatsApp buttons (nav + hero + CTA + footer) → `https://wa.me/9647730500554`
- Visible CTA button text → `واتساب +964 773 050 0554`

To change the number again later, search this folder for `9647730500554`
(and the display form `+964 773 050 0554`) and replace everywhere.

## Run it locally

```bash
cd agency-landing
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Before you launch — things to swap

- **Real photos**: every gradient block with a vector icon inside it is a
  placeholder (`.placeholder-media` in CSS) standing in for real office/
  team photography from the actual site. Hotlinked stock photos weren't
  used because this environment couldn't reach any external image host
  to verify a working URL — swap the `.placeholder-media` divs for real
  `<img>` tags when you have the photos (or your own vetted stock photo
  URLs).
- **Real logo**: the "Backup BU" text logo in the nav is a text
  reconstruction — swap for the actual logo file if you have it.
- **Pricing (الأسعار) and FAQ (الأسئلة) sections**: not built out — they
  weren't visible in the screenshots this page was built from. The nav
  links currently point back to the top of the page as placeholders. Send
  that content and these sections can be added.
- **EN toggle**: the "EN" button in the nav is currently decorative (no
  English version exists yet).
- **Client list**: the client pills (Alshaheera, FiberX, Almarai, etc.)
  were copied from the real site's client section — confirm they're still
  accurate before publishing.
