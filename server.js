/**
 * server.js — maly staticky server bez zavislosti.
 *
 * Preco: appka sa da otvorit aj z GitHub Pages, ale ked raz pridas WiFi teplomery
 * v domacej sieti, prehliadac nedovoli stranke na https:// citat http:// zariadenie.
 * Vtedy pust appku odtialto (napr. na NAS alebo Raspberry) a otvor ju na telefone
 * cez http://<ip-pocitaca>:8080.
 *
 *   node server.js            → http://0.0.0.0:8080
 *   PORT=3000 node server.js
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';

    // zabranime vystupu mimo priecinka appky
    const full = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!full.startsWith(ROOT)) {
      res.writeHead(403).end('Zakázané');
      return;
    }

    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nenájdené');
      return;
    }

    const body = await readFile(full);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }).end(body);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Chyba: ${e.message}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ekvitermika beží na porte ${PORT}`);
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  http://${a.address}:${PORT}   (${name})`);
    }
  }
  console.log('Na telefóne otvor niektorú z adries vyššie (musíš byť v rovnakej WiFi).');
});
