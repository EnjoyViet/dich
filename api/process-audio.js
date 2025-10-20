// Vercel Serverless function: process-audio
// Environment variable required: GOOGLE_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_API_KEY in environment' });

    const { audioBase64, mimeType, selectL1, selectL2 } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });

    // 1) Call Google Speech-to-Text (synchronous recognize)
    const speechPayload = {
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "en-US", // primary; alternativeLanguageCodes used for auto detection
        alternativeLanguageCodes: ["ko-KR","vi-VN","en-US","zh-CN","ja-JP"]
      },
      audio: { content: audioBase64 }
    };

    const speechResp = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(speechPayload)
    });

    if (!speechResp.ok) {
      const txt = await speechResp.text();
      return res.status(500).json({ error: 'Speech-to-Text error', details: txt });
    }
    const speechJson = await speechResp.json();

    let transcript = '';
    let detectedLang = null;
    if (speechJson.results && speechJson.results.length) {
      transcript = speechJson.results.map(r => (r.alternatives && r.alternatives[0] && r.alternatives[0].transcript) ? r.alternatives[0].transcript : '').join(' ').trim();
      detectedLang = (speechJson.results[0] && speechJson.results[0].languageCode) || null;
    }

    if (!transcript) {
      return res.status(200).json({ transcript:'', detectedLang:null, translation:'', targetLang: selectL2 });
    }

    // 2) Call Gemini Generative Language API to translate
    // We'll ask Gemini to translate into target language (selectL1 or selectL2 logic)
    // Determine target: if detectedLang matches selectL1 -> translate to selectL2; if matches selectL2 -> translate to selectL1; else default to selectL2
    let targetLang = selectL2 || 'vi-VN';
    if (detectedLang) {
      const d = detectedLang.split('-')[0];
      const s1 = (selectL1||'ko-KR').split('-')[0];
      const s2 = (selectL2||'vi-VN').split('-')[0];
      if (d === s1) targetLang = selectL2;
      else if (d === s2) targetLang = selectL1;
    }

    const systemPrompt = `You are a professional translator. Detect the input language and translate the user's text into ${targetLang} naturally and concisely. Only return the translated text.`;
    const genPayload = {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: `Translate this text into ${targetLang}: "${transcript}"` }] }
      ],
      config: { temperature: 0.1, topK: 1, topP: 0.9 }
    };

    const genResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genPayload)
    });

    if (!genResp.ok) {
      const txt = await genResp.text();
      return res.status(500).json({ error: 'Generative API error', details: txt });
    }

    const genJson = await genResp.json();
    const translation = genJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return res.status(200).json({ transcript, detectedLang, translation, targetLang });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
