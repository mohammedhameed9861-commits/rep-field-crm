// Everything on the page that's specific to your business lives here.
// Edit this file to update content — you shouldn't need to touch App.tsx.

export const siteConfig = {
  businessName: "Petal & Stem Distribution",
  tagline: "Fresh-cut flowers, delivered daily to your shop.",
  subheading:
    "Wholesale flower distribution for florists, event planners, and retailers — reliable sourcing, competitive pricing, and a delivery route you can set your watch to.",

  // WhatsApp click-to-chat button.
  // Number must be digits only: country code + number, no "+", no spaces, no leading 0.
  // Example: a US number (555) 123-4567 -> "15551234567"
  whatsapp: {
    number: "15550000000", // TODO: replace with your real WhatsApp Business number
    message: "Hi! I'd like to know more about wholesale flower orders.",
  },

  contact: {
    email: "orders@example.com", // TODO: replace
    phoneDisplay: "+1 (555) 000-0000", // TODO: replace
    address: "123 Market Street, Your City", // TODO: replace
    hours: "Mon–Sat, 6:00 AM – 4:00 PM",
  },

  valueProps: [
    {
      title: "Fresh-cut daily",
      description:
        "Stock arrives fresh every morning, sourced directly from growers — no sitting in a warehouse.",
    },
    {
      title: "Reliable delivery routes",
      description:
        "Set delivery days for your shop and count on it — our reps run the same routes every week.",
    },
    {
      title: "Wholesale pricing",
      description:
        "Volume pricing for florists, event planners, and retailers, with simple invoicing per order.",
    },
    {
      title: "Wide variety",
      description:
        "Roses, seasonal blooms, greenery, and everything in between — one supplier for your full order.",
    },
  ],

  categories: [
    { name: "Roses", description: "Classic and garden varieties, in every color." },
    { name: "Seasonal Blooms", description: "Tulips, peonies, sunflowers — whatever's in season." },
    { name: "Greenery & Foliage", description: "Eucalyptus, ferns, and filler greens for arrangements." },
    { name: "Lilies & Orchids", description: "Statement flowers for high-end arrangements." },
    { name: "Wedding & Event", description: "Bulk arrangement-ready flowers for large orders." },
    { name: "Mixed Bouquets", description: "Pre-arranged mixes ready for retail display." },
  ],

  stats: [
    { value: "10+", label: "years distributing" },
    { value: "200+", label: "shops served" },
    { value: "6", label: "delivery days a week" },
  ],
} as const;

export function whatsappHref() {
  const encoded = encodeURIComponent(siteConfig.whatsapp.message);
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encoded}`;
}
