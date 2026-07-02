import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pages = JSON.parse(await readFile(path.join(root, "src", "seo-pages.json"), "utf8"));
const siteBaseUrl = "https://truongthlevantampongdrang-lab.github.io/truongthlevantampongdrang/";
const today = new Date().toISOString().slice(0, 10);

const urls = pages
  .map((page) => {
    const loc = new URL(page.path ? `${page.path}/` : "", siteBaseUrl).toString();
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      "  </url>"
    ].join("\n");
  })
  .join("\n\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>
`;

await writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");
await mkdir(path.join(root, "public"), { recursive: true });
await writeFile(path.join(root, "public", "sitemap.xml"), sitemap, "utf8");

console.log(`Generated sitemap.xml with ${pages.length} URLs.`);
