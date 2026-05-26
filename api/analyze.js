// api/analyze.js
// API key diambil dari Vercel Environment Variables (lebih aman)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  // Ambil dari Vercel Environment Variables
  const apiKey = process.env.SUMOPOD_API_KEY;
  const defaultModel = process.env.SUMOPOD_MODEL || 'kimi-k2.6';

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const response = await fetch('https://ai.sumopod.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || defaultModel,
        max_tokens: 4000,
        messages: messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Sumopod error:', response.status, errText);
      return res.status(response.status).json({ error: errText, status: response.status });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ text });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
