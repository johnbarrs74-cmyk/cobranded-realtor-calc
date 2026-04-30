// CSV export of all realtor signups. Designed for Google Sheets IMPORTDATA().
// Requires ?key=<EXPORT_KEY> for access (key stored as Vercel env var).

const GH_API = 'https://api.github.com';
const OWNER  = process.env.GITHUB_OWNER || 'johnbarrs74-cmyk';
const REPO   = process.env.GITHUB_REPO  || 'cobranded-realtor-calc';
const TOKEN  = process.env.GITHUB_TOKEN;
const KEY    = process.env.EXPORT_KEY;
const BRANCH = 'main';

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function ghJson(url) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${url} -> ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  // Only GET
  if (req.method !== 'GET') return res.status(405).send('method not allowed');

  // Auth via shared secret
  const provided = (req.query && req.query.key) || '';
  if (!KEY || provided !== KEY) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(403).send('forbidden');
  }
  if (!TOKEN) return res.status(500).send('server misconfigured');

  try {
    // List all JSON files in data/realtors/
    const listing = await ghJson(
      `${GH_API}/repos/${OWNER}/${REPO}/contents/data/realtors?ref=${BRANCH}`
    );

    const realtors = [];
    if (Array.isArray(listing)) {
      // Fetch each file's content in parallel
      const fetched = await Promise.all(
        listing
          .filter(f => f.name && f.name.endsWith('.json'))
          .map(async f => {
            const file = await ghJson(
              `${GH_API}/repos/${OWNER}/${REPO}/contents/${f.path}?ref=${BRANCH}`
            );
            if (!file) return null;
            try {
              const buf = Buffer.from(file.content, 'base64').toString('utf-8');
              return JSON.parse(buf);
            } catch { return null; }
          })
      );
      fetched.forEach(r => { if (r) realtors.push(r); });
    }

    // Sort by createdAt descending (newest first)
    realtors.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // CSV header
    const headers = [
      'Signup Date', 'Full Name', 'Title', 'Brokerage', 'License #', 'License State',
      'Phone', 'Email', 'Tagline', 'Notes', 'Calculator URL', 'Slug', 'Has Photo'
    ];

    const rows = [headers.map(csvEscape).join(',')];
    for (const r of realtors) {
      const url = `https://cobranded-realtor-calc.vercel.app/${r.slug || ''}`;
      const row = [
        r.createdAt || '',
        r.name || '',
        r.title || '',
        r.brokerage || '',
        r.licenseNumber || '',
        r.licenseState || '',
        r.phone || '',
        r.email || '',
        r.tagline || '',
        r.notes || '',
        url,
        r.slug || '',
        (r.photoUrl ? 'Yes' : 'No'),
      ].map(csvEscape).join(',');
      rows.push(row);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Disposition', 'inline; filename="realtor-signups.csv"');
    return res.status(200).send(rows.join('\n'));
  } catch (e) {
    return res.status(500).send('error: ' + (e.message || 'unknown'));
  }
}
