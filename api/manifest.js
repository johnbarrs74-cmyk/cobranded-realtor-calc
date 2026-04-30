// Dynamic PWA manifest. Returns a manifest with start_url pointing at the realtor's slug.
// Used so each partner's installed home-screen app launches THEIR personalized calculator,
// not the generic Sarah Jones default.

const GH_API = 'https://api.github.com';
const OWNER  = process.env.GITHUB_OWNER || 'johnbarrs74-cmyk';
const REPO   = process.env.GITHUB_REPO  || 'cobranded-realtor-calc';
const TOKEN  = process.env.GITHUB_TOKEN;
const BRANCH = 'main';

function safeName(s) {
  if (!s) return null;
  return String(s).replace(/[^A-Za-z0-9 .'’&\-]/g, '').slice(0, 30) || null;
}

async function fetchRealtor(slug) {
  if (!slug || !TOKEN) return null;
  try {
    const r = await fetch(
      `${GH_API}/repos/${OWNER}/${REPO}/contents/data/realtors/${encodeURIComponent(slug)}.json?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.content) return null;
    const decoded = Buffer.from(j.content, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch { return null; }
}

export default async function handler(req, res) {
  const slug = (req.query && req.query.slug) || '';
  const startUrl = slug ? `/${encodeURIComponent(slug)}` : '/';

  // Personalize the app name per realtor when possible
  let appName = "Mortgage Calculator";
  let shortName = "Mortgage";
  if (slug) {
    const realtor = await fetchRealtor(slug);
    if (realtor && realtor.name) {
      const first = (realtor.name.split(' ')[0] || '').trim();
      if (first) {
        appName = `${realtor.name} · Mortgage`;
        shortName = safeName(first) || "Mortgage";
      }
    }
  }

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=60');

  return res.status(200).json({
    name: appName,
    short_name: shortName,
    description: "Mortgage calculator with live VA, FHA, and Conventional rates.",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  });
}
