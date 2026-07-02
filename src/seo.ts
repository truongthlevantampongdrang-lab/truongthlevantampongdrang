import seoPages from "./seo-pages.json";

export type SeoPage = {
  tab: string;
  path: string;
  title: string;
  description: string;
  keywords: string;
  breadcrumb: string;
  priority: string;
  changefreq: string;
};

export const SITE_BASE_URL = "https://truongthlevantampongdrang-lab.github.io/truongthlevantampongdrang/";
export const SITE_BASE_PATH = "/truongthlevantampongdrang/";
export const SITE_NAME = "Trường Tiểu học Lê Văn Tám";
export const SCHOOL_EMAIL = "truongthlevantampongdrang@gmail.com";
export const SCHOOL_PHONE = "0262.387.1234";
export const SCHOOL_ADDRESS = "Buôn Ea Đơng, xã Pơng Drang, tỉnh Đắk Lắk, Việt Nam";

export const SEO_PAGES = seoPages as SeoPage[];

export function getSeoPage(tab: string) {
  return SEO_PAGES.find((page) => page.tab === tab) || SEO_PAGES[0];
}

export function getSeoPageByPath(pathname: string) {
  const cleanPath = pathname
    .replace(SITE_BASE_PATH, "")
    .replace(/^\/+|\/+$/g, "");

  return SEO_PAGES.find((page) => page.path === cleanPath) || SEO_PAGES[0];
}

export function getPageUrl(page: SeoPage) {
  return new URL(page.path ? `${page.path}/` : "", SITE_BASE_URL).toString();
}

export function getPagePath(page: SeoPage) {
  return `${SITE_BASE_PATH}${page.path}`.replace(/\/?$/, "/");
}

export function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value);
  });
}

export function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value);
  });
}

export function buildStructuredData(activePage: SeoPage) {
  const pageUrl = getPageUrl(activePage);
  const logoUrl = new URL("icons/icon-512.png", SITE_BASE_URL).toString();

  return [
    {
      "@context": "https://schema.org",
      "@type": "School",
      "@id": `${SITE_BASE_URL}#school`,
      name: SITE_NAME,
      alternateName: "TH Lê Văn Tám Pơng Drang",
      url: SITE_BASE_URL,
      logo: logoUrl,
      image: logoUrl,
      description: SEO_PAGES[0].description,
      email: SCHOOL_EMAIL,
      telephone: SCHOOL_PHONE,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Buôn Ea Đơng",
        addressLocality: "Pơng Drang",
        addressRegion: "Đắk Lắk",
        addressCountry: "VN"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_BASE_URL}#organization`,
      name: SITE_NAME,
      url: SITE_BASE_URL,
      logo: logoUrl,
      email: SCHOOL_EMAIL,
      telephone: SCHOOL_PHONE,
      address: SCHOOL_ADDRESS
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_BASE_URL}#website`,
      name: SITE_NAME,
      url: SITE_BASE_URL,
      inLanguage: "vi-VN",
      publisher: {
        "@id": `${SITE_BASE_URL}#organization`
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_BASE_URL}tin-tuc?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Trang chủ",
          item: SITE_BASE_URL
        },
        {
          "@type": "ListItem",
          position: 2,
          name: activePage.breadcrumb,
          item: pageUrl
        }
      ]
    }
  ];
}

