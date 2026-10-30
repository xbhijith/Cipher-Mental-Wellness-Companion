/* OPTIONAL backend for deeper conversations. Needs Node 18+.
   Run:  ANTHROPIC_API_KEY=sk-... node server.js   then open http://localhost:3000
   Then add this line in index.html before companion.js:  <script>window.CIPHER_API='/api/chat'</script>
   NOTE: this sends chat text to a server. Tell users, and keep it opt-in. Crisis messages are never sent. */
const http = require('http'), fs = require('fs'), path = require('path');
const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = ''; for await (const c of req) body += c;
    try {
      const { name, pet, messages } = JSON.parse(body);
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, max_tokens: 300, messages,
          system: `You are ${pet}, a warm, gentle wellness companion for ${name}. Reply in 2-3 short sentences. Validate feelings first and ask at most one question. You are not a therapist and never diagnose. If the user mentions self-harm or suicide, encourage them to contact a local crisis line or emergency services.`
        })
      });
      const j = await r.json();
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ reply: j.content && j.content[0] && j.content[0].text }));
    } catch (e) { res.statusCode = 500; res.end('{}'); }
    return;
  }
  const f = path.join(__dirname, req.url === '/' ? 'index.html' : path.basename(req.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', TYPES[path.extname(f)] || 'text/plain'); res.end(d);
  });
}).listen(3000, () => console.log('Cipher on http://localhost:3000'));