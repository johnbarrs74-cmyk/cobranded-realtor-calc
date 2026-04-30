// Vercel serverless function. Lives at /api/realtor on the cobranded-realtor-calc domain.
// POST: create a new realtor (data committed as JSON to GitHub).
// GET ?slug=...: fetch one realtor's data.

const GH_API = 'https://api.github.com';
const OWNER  = process.env.GITHUB_OWNER || 'johnbarrs74-cmyk';
const REPO   = process.env.GITHUB_REPO  || 'cobranded-realtor-calc';
const TOKEN  = process.env.GITHUB_TOKEN;
const BRANCH = 'main';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function applyCors(res) {
  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

async function ghGetFile(path) {
  const r = await fetch(
    `${GH_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status}`);
  const j = await r.json();
  // content is base64; decode
  const content = Buffer.from(j.content, 'base64').toString('utf-8');
  return { content, sha: j.sha };
}

async function ghPutFile(path, contentString, message) {
  const existing = await ghGetFile(path).catch(() => null);
  const body = {
    message,
    branch: BRANCH,
    content: Buffer.from(contentString, 'utf-8').toString('base64'),
  };
  if (existing && existing.sha) body.sha = existing.sha;

  const r = await fetch(
    `${GH_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GitHub PUT ${path} failed: ${r.status} ${t.slice(0, 200)}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    return res.status(204).end();
  }
  applyCors(res);

  if (!TOKEN) {
    return res.status(500).json({ error: 'Server is missing GITHUB_TOKEN env var' });
  }

  if (req.method === 'GET') {
    const slug = (req.query && req.query.slug) || '';
    if (!slug) return res.status(400).json({ error: 'slug query param required' });
    try {
      const file = await ghGetFile(`data/realtors/${slug}.json`);
      if (!file) return res.status(404).json({ error: 'realtor not found', slug });
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json(JSON.parse(file.content));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const {
        fullName, brokerage, licenseNumber, licenseState,
        phone, email, title, tagline,
        photoBase64, notes,
      } = body;

      if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'fullName is required' });
      if (!brokerage || !brokerage.trim()) return res.status(400).json({ error: 'brokerage is required' });
      if (!phone || !phone.trim()) return res.status(400).json({ error: 'phone is required' });
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'valid email is required' });

      const baseSlug = slugify(fullName);
      if (!baseSlug) return res.status(400).json({ error: 'could not generate slug from name' });

      // Find a unique slug
      let finalSlug = baseSlug;
      for (let i = 1; i <= 50; i++) {
        const existing = await ghGetFile(`data/realtors/${finalSlug}.json`);
        if (!existing) break;
        finalSlug = `${baseSlug}-${i}`;
        if (i === 50) return res.status(500).json({ error: 'too many name collisions' });
      }

      const phoneRaw = String(phone).replace(/\D/g, '');

      // Validate photo size if present (limit to ~500KB after base64 = ~370KB raw)
      let safePhoto = '';
      if (photoBase64 && typeof photoBase64 === 'string') {
        if (photoBase64.length > 700000) {
          return res.status(400).json({ error: 'photo too large; please use a smaller image' });
        }
        safePhoto = photoBase64;
      }

      const realtor = {
        slug: finalSlug,
        name: fullName.trim(),
        title: title || 'REALTOR®',
        brokerage: brokerage.trim(),
        licenseNumber: licenseNumber || '',
        licenseState: licenseState || 'TN',
        phone: phone.trim(),
        phoneRaw,
        email: email.trim(),
        tagline: (tagline || '').trim(),
        photoUrl: safePhoto,
        notes: (notes || '').trim(),
        createdAt: new Date().toISOString(),
      };

      await ghPutFile(
        `data/realtors/${finalSlug}.json`,
        JSON.stringify(realtor, null, 2),
        `Add realtor: ${realtor.name}`
      );

      const url = `https://cobranded-realtor-calc.vercel.app/${finalSlug}`;
      return res.status(200).json({
        slug: finalSlug,
        url,
        realtor: { name: realtor.name, brokerage: realtor.brokerage },
      });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'internal error' });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
