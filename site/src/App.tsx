import {
  Flower2,
  Leaf,
  MessageCircle,
  Tag,
  Truck,
  Mail,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import { siteConfig, whatsappHref } from "./siteConfig";

const valuePropIcons = [Truck, Leaf, Tag, Flower2];

function WhatsAppButton({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-leaf-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-leaf-700 ${className}`}
    >
      <MessageCircle size={20} />
      {children}
    </a>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-bloom-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Flower2 className="text-bloom-600" size={26} />
            <span className="font-display text-lg font-semibold text-gray-900">
              {siteConfig.businessName}
            </span>
          </div>
          <WhatsAppButton className="hidden sm:inline-flex">
            Chat on WhatsApp
          </WhatsAppButton>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-bloom-50 to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-bloom-200/50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-leaf-100 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
              {siteConfig.tagline}
            </h1>
            <p className="mt-5 text-lg text-gray-600">
              {siteConfig.subheading}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <WhatsAppButton>Order on WhatsApp</WhatsAppButton>
              <a
                href={`tel:${siteConfig.contact.phoneDisplay.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-bloom-700"
              >
                <Phone size={18} />
                {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.valueProps.map((prop, i) => {
            const Icon = valuePropIcons[i % valuePropIcons.length];
            return (
              <div key={prop.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-bloom-50 p-3 text-bloom-600">
                  <Icon size={22} />
                </div>
                <h3 className="font-display text-lg font-semibold">{prop.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{prop.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-leaf-50/60 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-gray-900">What we supply</h2>
            <p className="mt-3 text-gray-600">
              A full catalog for florists and retailers — ask on WhatsApp for current stock and pricing.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.categories.map((cat) => (
              <div key={cat.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-xl bg-leaf-100 p-2.5 text-leaf-600">
                  <Flower2 size={20} />
                </div>
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <p className="mt-1.5 text-sm text-gray-600">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-leaf-700 py-14 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {siteConfig.stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-4xl font-bold">{stat.value}</div>
              <div className="mt-1 text-sm uppercase tracking-wide text-leaf-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-bloom-600 px-8 py-14 text-center text-white sm:px-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Ready to place an order?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-bloom-50">
            Message us on WhatsApp for today's availability and wholesale pricing.
          </p>
          <div className="mt-8 flex justify-center">
            <WhatsAppButton className="bg-white text-leaf-700 hover:bg-bloom-50">
              Chat on WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Flower2 className="text-bloom-600" size={22} />
                <span className="font-display text-lg font-semibold">
                  {siteConfig.businessName}
                </span>
              </div>
              <p className="mt-2 max-w-xs text-sm text-gray-600">
                Wholesale flower distribution — fresh stock, reliable routes.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} /> {siteConfig.contact.address}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} /> {siteConfig.contact.phoneDisplay}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} /> {siteConfig.contact.email}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} /> {siteConfig.contact.hours}
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-xs text-gray-400">
            © {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating mobile WhatsApp button */}
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center rounded-full bg-leaf-600 p-4 text-white shadow-lg transition hover:bg-leaf-700 sm:hidden"
      >
        <MessageCircle size={24} />
      </a>
    </div>
  );
}
