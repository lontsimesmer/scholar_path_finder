export const SITE_URL = "https://www.powerprestation.com";

const SOCIAL_PROFILES = [
  "https://www.facebook.com/profile.php?id=61578800394432",
  "https://www.tiktok.com/@power.prestation",
  "https://www.instagram.com/power.prestation",
  "https://www.linkedin.com/company/powerprestation/",
];

const CONTACT = {
  email: "powerprestationint@gmail.com",
  telephone: "+237674819411",
};

const ADDRESS = {
  streetAddress: "FOUDA, derrière le FNE",
  addressLocality: "Yaoundé",
  addressCountry: "CM",
};

export const buildOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Power Prestation",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  email: CONTACT.email,
  telephone: CONTACT.telephone,
  sameAs: SOCIAL_PROFILES,
  address: {
    "@type": "PostalAddress",
    ...ADDRESS,
  },
});

export const buildLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#localbusiness`,
  name: "Power Prestation",
  image: `${SITE_URL}/og-image.jpg`,
  url: SITE_URL,
  telephone: CONTACT.telephone,
  email: CONTACT.email,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    ...ADDRESS,
  },
  areaServed: {
    "@type": "Country",
    name: "Cameroon",
  },
  sameAs: SOCIAL_PROFILES,
});

export const buildWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Power Prestation",
  inLanguage: ["fr", "en"],
  publisher: { "@id": `${SITE_URL}/#organization` },
});

interface ArticleInput {
  title: string;
  description: string;
  image?: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  language: "fr" | "en";
}

interface FaqQuestion {
  question: string;
  answer: string;
}

export const buildFaqPageSchema = (items: FaqQuestion[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
});

export const buildArticleSchema = ({
  title,
  description,
  image,
  url,
  datePublished,
  dateModified,
  language,
}: ArticleInput) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  image: image ? [image] : undefined,
  datePublished,
  dateModified: dateModified ?? datePublished,
  inLanguage: language,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": url,
  },
  author: {
    "@type": "Organization",
    name: "Power Prestation",
    url: SITE_URL,
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
});
