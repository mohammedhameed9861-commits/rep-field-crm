// Brand/business config that doesn't need translation.
// Page text (headings, descriptions) lives in src/i18n/locales/en.json and ar.json.

interface SiteConfig {
  businessName: string;
  whatsapp: { number: string; messageEn: string; messageAr: string };
  contact: {
    email: string;
    phoneDisplay: string;
    address: string;
    hours: string;
    instagram: string;
  };
  /** Optional: path to a real hero background video (e.g. "/hero.mp4"). Leave empty to use the animated botanical fallback. */
  heroVideoSrc: string;
}

export const siteConfig: SiteConfig = {
  businessName: "Flowercom",

  // WhatsApp click-to-chat button.
  // Number must be digits only: country code + number, no "+", no spaces, no leading 0.
  whatsapp: {
    number: "", // TODO: waiting on real WhatsApp number — button is hidden until this is set
    messageEn: "Hi! I'd like to know more about wholesale flower orders.",
    messageAr: "مرحبًا! أريد الاستفسار عن طلبات الزهور بالجملة.",
  },

  contact: {
    email: "sales@flowercomiq.com",
    phoneDisplay: "", // TODO: confirm public phone number
    address: "", // TODO
    hours: "", // TODO
    instagram: "flowecomiq",
  },

  heroVideoSrc: "",
};

export function whatsappHref(lang: "en" | "ar") {
  const message = lang === "ar" ? siteConfig.whatsapp.messageAr : siteConfig.whatsapp.messageEn;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encoded}`;
}
