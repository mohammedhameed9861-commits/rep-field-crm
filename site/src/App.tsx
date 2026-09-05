import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Truck,
  Sprout,
  Tag,
  Flower2,
} from "lucide-react";
import { setLanguage } from "./i18n";
import { siteConfig, whatsappHref } from "./siteConfig";
import logoBlack from "./assets/logo-black.png";
import logoCream from "./assets/logo-cream.png";

const valuePropIcons = [Truck, Sprout, Tag, Flower2];

// --- Thin-line botanical shapes, matching the brand's hand-drawn illustration style ---

type ShapeProps = { className?: string; style?: React.CSSProperties };

function LeafShape({ className = "", style }: ShapeProps) {
  return (
    <svg viewBox="0 0 60 90" fill="none" className={className} style={style}>
      <path
        d="M30 5C46 20 50 45 30 85C10 45 14 20 30 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M30 12V80" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function FlowerShape({ className = "", style }: ShapeProps) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} style={style}>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="40"
          cy="22"
          rx="9"
          ry="16"
          stroke="currentColor"
          strokeWidth="1.2"
          transform={`rotate(${deg} 40 40)`}
        />
      ))}
      <circle cx="40" cy="40" r="4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Floating background botanicals for the hero — the "moving" fallback until a real video is added. */
function AnimatedBotanicals() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <LeafShape className="absolute left-[8%] top-[20%] h-20 w-14 text-plum-300/60 animate-drift-slow" />
      <FlowerShape className="absolute right-[12%] top-[15%] h-16 w-16 text-teal-400/60 animate-drift-reverse" />
      <LeafShape className="absolute right-[20%] top-[55%] h-24 w-16 text-teal-500/40 animate-drift" />
      <FlowerShape className="absolute left-[18%] top-[60%] h-12 w-12 text-plum-400/50 animate-drift-reverse" />
      <LeafShape className="absolute left-[45%] top-[8%] h-14 w-10 text-plum-200/50 animate-fall" style={{ animationDelay: "2s" }} />
      <FlowerShape className="absolute left-[65%] top-[5%] h-10 w-10 text-teal-400/50 animate-fall" style={{ animationDelay: "7s" }} />
      <LeafShape className="absolute left-[30%] top-[10%] h-12 w-8 text-teal-300/40 animate-fall" style={{ animationDelay: "11s" }} />
    </div>
  );
}

function useWhatsapp(lang: "en" | "ar") {
  const hasNumber = siteConfig.whatsapp.number.trim().length > 0;
  return { href: hasNumber ? whatsappHref(lang) : undefined, hasNumber };
}

function WhatsAppButton({
  className = "",
  children,
  lang,
}: {
  className?: string;
  children: React.ReactNode;
  lang: "en" | "ar";
}) {
  const { href, hasNumber } = useWhatsapp(lang);
  if (!hasNumber) {
    return (
      <span
        title="Add your WhatsApp number in src/siteConfig.ts to activate this button"
        className={`inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-teal-500/50 px-6 py-3 font-semibold text-white ${className}`}
      >
        <MessageCircle size={20} />
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-600 ${className}`}
    >
      <MessageCircle size={20} />
      {children}
    </a>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "ar" ? "ar" : "en") as "en" | "ar";
  const isRtl = lang === "ar";
  const displayFont = isRtl ? "font-arabicDisplay" : "font-display";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-plum-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <img src={logoBlack} alt={siteConfig.businessName} className="h-12 w-auto" />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(isRtl ? "en" : "ar")}
              className="rounded-full border border-plum-200 px-3 py-1.5 text-sm font-semibold text-plum-700 transition hover:bg-plum-50"
            >
              {isRtl ? "English" : "العربية"}
            </button>
            <WhatsAppButton lang={lang} className="hidden sm:inline-flex">
              {t("nav.whatsapp")}
            </WhatsAppButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-plum-50 via-cream-50 to-white">
        {siteConfig.heroVideoSrc ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={siteConfig.heroVideoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <AnimatedBotanicals />
        )}
        {siteConfig.heroVideoSrc && (
          <div aria-hidden="true" className="absolute inset-0 bg-plum-800/50" />
        )}
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className={`max-w-2xl animate-fade-up ${siteConfig.heroVideoSrc ? "text-white" : ""}`}>
            <h1 className={`${displayFont} text-4xl font-bold leading-tight sm:text-5xl`}>
              {t("hero.tagline")}
            </h1>
            <p className={`mt-5 text-lg ${siteConfig.heroVideoSrc ? "text-white/90" : "text-gray-600"}`}>
              {t("hero.subheading")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <WhatsAppButton lang={lang}>{t("hero.cta")}</WhatsAppButton>
              {siteConfig.contact.phoneDisplay && (
                <a
                  href={`tel:${siteConfig.contact.phoneDisplay.replace(/[^+\d]/g, "")}`}
                  className={`inline-flex items-center gap-2 font-semibold ${
                    siteConfig.heroVideoSrc ? "text-white" : "text-gray-700"
                  } hover:text-teal-600`}
                >
                  <Phone size={18} />
                  {siteConfig.contact.phoneDisplay}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {(t("valueProps.items", { returnObjects: true }) as { title: string; description: string }[]).map(
            (prop, i) => {
              const Icon = valuePropIcons[i % valuePropIcons.length];
              return (
                <div key={prop.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="mb-4 inline-flex rounded-xl bg-plum-50 p-3 text-plum-600">
                    <Icon size={22} />
                  </div>
                  <h3 className={`${displayFont} text-lg font-semibold`}>{prop.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{prop.description}</p>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-teal-50/60 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-xl">
            <h2 className={`${displayFont} text-3xl font-bold text-gray-900`}>
              {t("categories.title")}
            </h2>
            <p className="mt-3 text-gray-600">{t("categories.subheading")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(t("categories.items", { returnObjects: true }) as { name: string; description: string }[]).map(
              (cat) => (
                <div key={cat.name} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="mb-3 inline-flex rounded-xl bg-teal-100 p-2.5 text-teal-600">
                    <Flower2 size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <p className="mt-1.5 text-sm text-gray-600">{cat.description}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-plum-700 py-14 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {(t("stats", { returnObjects: true }) as { value: string; label: string }[]).map((stat) => (
            <div key={stat.label}>
              <div className={`${displayFont} text-4xl font-bold`}>{stat.value}</div>
              <div className="mt-1 text-sm uppercase tracking-wide text-plum-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-teal-600 px-8 py-14 text-center text-white sm:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20">
            <FlowerShape className="absolute -left-4 -top-4 h-28 w-28 text-white animate-drift-slow" />
            <LeafShape className="absolute -right-2 bottom-0 h-32 w-20 text-white animate-drift-reverse" />
          </div>
          <div className="relative">
            <h2 className={`${displayFont} text-3xl font-bold sm:text-4xl`}>
              {t("closingCta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-teal-50">{t("closingCta.subheading")}</p>
            <div className="mt-8 flex justify-center">
              <WhatsAppButton lang={lang} className="bg-white !text-teal-700 hover:bg-teal-50">
                {t("closingCta.button")}
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-plum-800 text-plum-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div>
              <img src={logoCream} alt={siteConfig.businessName} className="h-12 w-auto" />
              <p className="mt-2 max-w-xs text-sm text-plum-200">{t("footer.description")}</p>
            </div>
            <div className="space-y-2 text-sm text-plum-100">
              {siteConfig.contact.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} /> {siteConfig.contact.address}
                </div>
              )}
              {siteConfig.contact.phoneDisplay && (
                <div className="flex items-center gap-2">
                  <Phone size={16} /> {siteConfig.contact.phoneDisplay}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail size={16} /> {siteConfig.contact.email}
              </div>
              {siteConfig.contact.hours && (
                <div className="flex items-center gap-2">
                  <Clock size={16} /> {t("footer.hoursLabel")}: {siteConfig.contact.hours}
                </div>
              )}
            </div>
          </div>
          <div className="mt-10 border-t border-plum-700 pt-6 text-xs text-plum-300">
            © {new Date().getFullYear()} {siteConfig.businessName}. {t("footer.rights")}
          </div>
        </div>
      </footer>

      {/* Floating mobile WhatsApp button */}
      <div className="fixed bottom-5 right-5 z-50 sm:hidden">
        <WhatsAppButton lang={lang} className="!rounded-full !p-4">
          <span className="sr-only">{t("nav.whatsapp")}</span>
        </WhatsAppButton>
      </div>
    </div>
  );
}
