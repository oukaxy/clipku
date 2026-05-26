// api/transcript.js
// Vercel Serverless Function
// Ambil transkrip YouTube tanpa API key

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vid } = req.query;
  if (!vid) return res.status(400).json({ error: 'Missing vid' });

  try {
    // Method: Fetch YouTube page and extract transcript data
    // Using youtube-transcript via timedtext API
    const timedTextUrl = `https://www.youtube.com/api/timedtext?lang=id&v=${vid}&fmt=json3`;
    const timedTextUrlEn = `https://www.youtube.com/api/timedtext?lang=en&v=${vid}&fmt=json3`;

    let transcript = '';

    // Try Indonesian first, then English
    for (const url of [timedTextUrl, timedTextUrlEn]) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
        });
        if (r.ok) {
          const data = await r.json();
          if (data.events && data.events.length > 0) {
            // Build transcript with timestamps
            const lines = data.events
              .filter(e => e.segs)
              .map(e => {
                const startSec = Math.floor((e.tStartMs || 0) / 1000);
                const mm = String(Math.floor(startSec / 60)).padStart(2, '0');
                const ss = String(startSec % 60).padStart(2, '0');
                const text = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
                return text ? `[${mm}:${ss}] ${text}` : null;
              })
              .filter(Boolean);

            if (lines.length > 0) {
              transcript = lines.join('\n');
              break;
            }
          }
        }
      } catch { continue; }
    }

    // If still no transcript, try auto-generated
    if (!transcript) {
      try {
        const autoUrl = `https://www.youtube.com/api/timedtext?lang=id&v=${vid}&fmt=json3&kind=asr`;
        const autoUrlEn = `https://www.youtube.com/api/timedtext?lang=en&v=${vid}&fmt=json3&kind=asr`;
        
        for (const url of [autoUrl, autoUrlEn]) {
          const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
          });
          if (r.ok) {
            const data = await r.json();
            if (data.events && data.events.length > 0) {
              const lines = data.events
                .filter(e => e.segs)
                .map(e => {
                  const startSec = Math.floor((e.tStartMs || 0) / 1000);
                  const mm = String(Math.floor(startSec / 60)).padStart(2, '0');
                  const ss = String(startSec % 60).padStart(2, '0');
                  const text = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
                  return text ? `[${mm}:${ss}] ${text}` : null;
                })
                .filter(Boolean);
              if (lines.length > 0) {
                transcript = lines.join('\n');
                break;
              }
            }
          }
        }
      } catch {}
    }

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not available', transcript: null });
    }

    // Limit to ~8000 chars to save tokens
    const trimmed = transcript.length > 8000
      ? transcript.substring(0, 8000) + '\n[...transkrip dipotong untuk efisiensi...]'
      : transcript;

    return res.status(200).json({ transcript: trimmed });

  } catch (err) {
    console.error('Transcript error:', err);
    return res.status(500).json({ error: err.message, transcript: null });
  }
}
