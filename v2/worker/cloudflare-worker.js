// Cloudflare Worker — proxies chat/insight requests to Google Gemini so the API key
// never touches the browser or the GitHub Pages repo.
//
// Deploy steps (Cloudflare dashboard):
// 1) workers.cloudflare.com -> Create Worker -> paste this file's content -> Deploy.
// 2) Worker -> Settings -> Variables -> add a SECRET named GEMINI_API_KEY (your Gemini API key).
// 3) Copy the Worker's URL (https://<name>.<account>.workers.dev) into Albatil Fitness ->
//    الإعدادات -> رابط المدرب الذكي (Worker).
// 4) Optional: Settings -> Variables -> ALLOWED_ORIGIN = your GitHub Pages origin, to lock down CORS.

export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    try {
      const body = await request.json(); // { system?: string, messages: [{role,content}] }
      const contents = (body.messages || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }]
      }));

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: body.system ? { parts: [{ text: body.system }] } : undefined,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
          })
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: 'Gemini error', detail: errText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
};
