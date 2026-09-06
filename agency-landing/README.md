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
  images/       Real photos (AI-generated stock-style placeholders for now)
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

- **Real photos**: 3 of the 5 image slots now use real photo files
  (`images/*.webp`) — AI-generated stock-style shots, not actual photos
  of your team/office, used as a stand-in until you have real ones:
  - Hero main photo, About section photo, and the "03 مراجعة الأداء"
    step photo are filled in.
  - The "01 التنفيذ" and "02 أفكار حملات" step cards still use the
    vector icons — no photo was provided for those two. Add
    `images/<file>.webp` and swap the `.media-icon-wrap` block for an
    `<img class="media-photo" src="images/<file>.webp">` the same way
    the other three are done, whenever you have shots for those.
  - To replace any of the 3 filled-in placeholders with your *actual*
    photography later, just swap the `src` on that `<img class="media-photo">`.
- **Real logo**: the "Backup BU" text logo in the nav is a text
  reconstruction — swap for the actual logo file if you have it.
- **Pricing (الأسعار) and FAQ (الأسئلة) sections**: not built out — they
  weren't visible in the screenshots this page was built from. The nav
  links currently point back to the top of the page as placeholders. Send
  that content and these sections can be added.
- **EN toggle**: the "EN" button in the nav is currently decorative (no
  English version exists yet).
- **Client list**: the 11 client pills (Almarai, Avoca, BYD Auto Iraq,
  Iraq Mall, AUIB, ICS Iraq, Bayt Halab, Four Views Restaurant, Honor
  Iraq, Royal Hospital Baghdad, Medworx) each link to that client's real
  Instagram profile. Double-check "Bayt Halab" — its display name was
  guessed from the handle `baythalab.iq`, confirm the correct spelling.
  To add/remove a client, edit the pill list in **both** `.pill-track`
  blocks in `index.html` (the second is the hidden duplicate that makes
  the marquee loop seamlessly) — they must stay identical.
