import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = 'https://arenaofvalor.fandom.com/vi/api.php';
const usefulSection = /thông tin|tương tác|kỹ năng|trang bị|phù hiệu|ngọc|phép bổ trợ|lối chơi|mẹo|chiến thuật|cách chơi|tiểu sử/i;
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', times: '×', minus: '−' };
const clean = text => text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (original, entity) => {
  if (!entity.startsWith('#')) return entities[entity] ?? original;
  const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : original;
}).replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').trim();

// MediaWiki expands nested skill templates. Only inert text and table cells
// leave this extractor; source HTML, scripts and event attributes are not shipped.
export async function extractWikiDetails(html, headings) {
  const sections = [];
  let section;
  const blocks = [], tables = [], rows = [], cells = [];
  const rewriter = new HTMLRewriter()
    .on('.mw-headline', {
      element(element) {
        const heading = headings.find(entry => entry.anchor === element.getAttribute('id'));
        section = heading && usefulSection.test(heading.line)
          ? { title: '', anchor: heading.anchor, level: Number(heading.level), blocks: [] }
          : undefined;
        if (section) sections.push(section);
      },
      text(chunk) { if (section) section.title += chunk.text; },
    })
    .on('.mw-parser-output > p, .mw-parser-output > ul > li, .mw-parser-output > ol > li, .wikia-gallery-item .lightbox-caption', {
      element(element) {
        if (!section) return;
        const block = { kind: element.tagName === 'p' ? 'paragraph' : 'bullet', text: '' };
        section.blocks.push(block);
        blocks.push(block);
        element.onEndTag(() => blocks.pop());
      },
      text(chunk) { if (blocks.length) blocks.at(-1).text += chunk.text; },
    })
    .on('table.wikitable', {
      element(element) {
        if (!section) return;
        const table = { kind: 'table', rows: [] };
        section.blocks.push(table);
        tables.push(table);
        element.onEndTag(() => tables.pop());
      },
    })
    .on('table.wikitable tr', {
      element(element) {
        if (!tables.length) return;
        const row = [];
        tables.at(-1).rows.push(row);
        rows.push(row);
        element.onEndTag(() => rows.pop());
      },
    })
    .on('table.wikitable td, table.wikitable th', {
      element(element) {
        if (!rows.length) return;
        const cell = { text: '', header: element.tagName === 'th' };
        rows.at(-1).push(cell);
        cells.push(cell);
        element.onEndTag(() => cells.pop());
      },
      text(chunk) { if (cells.length) cells.at(-1).text += chunk.text; },
    })
    .on('br', {
      element() {
        if (cells.length) cells.at(-1).text += '\n';
        else if (blocks.length) blocks.at(-1).text += '\n';
      },
    });
  await rewriter.transform(new Response(html)).text();
  for (const entry of sections) {
    entry.title = clean(entry.title);
    for (const block of entry.blocks) {
      if (block.kind === 'table') {
        block.rows = block.rows.map(row => row.map(cell => ({ ...cell, text: clean(cell.text) })))
          .filter(row => row.some(cell => cell.text));
      } else block.text = clean(block.text);
    }
    entry.blocks = entry.blocks.filter(block => block.kind === 'table' ? block.rows.length : block.text);
  }
  return sections.filter(entry => entry.blocks.length);
}

async function request(parameters) {
  const url = new URL(api);
  url.search = new URLSearchParams({ action: 'query', format: 'json', ...parameters });
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Fandom HTTP ${response.status}: ${url}`);
  const data = await response.json();
  if (data.error) throw new Error(`Fandom ${data.error.code}: ${data.error.info}`);
  return { url: url.href, data };
}

export async function collectFandom(heroes, fetchedAt = new Date().toISOString()) {
  const { data: site } = await request({ meta: 'siteinfo', siprop: 'general|rightsinfo' });
  const titles = heroes.map(hero => ({
    slug: hero.slug,
    title: hero.sources.fandomVi
      ? decodeURIComponent(new URL(hero.sources.fandomVi).pathname.split('/wiki/')[1]).replaceAll('_', ' ')
      : hero.name,
  }));
  const mappings = [];
  for (let index = 0; index < titles.length; index += 40) {
    const batch = titles.slice(index, index + 40);
    const { data } = await request({
      prop: 'info|revisions', inprop: 'url', rvprop: 'ids|timestamp|content',
      rvslots: 'main', redirects: '1', titles: batch.map(entry => entry.title).join('|'),
    });
    for (const entry of batch) {
      let title = entry.title;
      for (const redirect of [...(data.query.normalized || []), ...(data.query.redirects || [])]) {
        if (title === redirect.from) title = redirect.to;
      }
      const page = Object.values(data.query.pages).find(page => page.title === title);
      if (!page) throw new Error(`Unresolved wiki response: ${entry.title}`);
      mappings.push({ ...entry, page });
    }
  }
  const records = new Array(mappings.length), evidence = new Array(mappings.length);
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < mappings.length) {
      const index = next++;
      const { slug, title, page } = mappings[index];
      if (page.missing !== undefined || !page.revisions?.length) {
        records[index] = { slug, status: 'missing', requestedTitle: title, sections: [] };
        evidence[index] = { slug, title, status: 'missing' };
        continue;
      }
      const revision = page.revisions[0];
      const { url, data } = await request({
        action: 'parse', oldid: String(revision.revid), prop: 'text|sections|displaytitle',
      });
      const html = data.parse.text['*'];
      const sections = await extractWikiDetails(html, data.parse.sections);
      const source = {
        title: page.title, url: page.fullurl, pageId: page.pageid,
        revisionId: revision.revid, editedAt: revision.timestamp, fetchedAt,
        revisionUrl: `${api.replace('/api.php', '/index.php')}?oldid=${revision.revid}`,
        apiUrl: url,
        textSha256: new Bun.CryptoHasher('sha256').update(revision.slots.main['*']).digest('hex'),
        renderedSha256: new Bun.CryptoHasher('sha256').update(html).digest('hex'),
      };
      records[index] = { slug, status: sections.length ? 'available' : 'empty', source, sections };
      evidence[index] = { slug, source, wikitext: revision.slots.main['*'] };
    }
  }));
  return {
    data: {
      locale: 'vi', fetchedAt, api, site: site.query.general.sitename,
      license: site.query.rightsinfo,
      note: 'Bản chụp wiki cộng đồng có ghi phiên bản trang; ngày sửa không bảo đảm mọi chi tiết khớp bản cân bằng mới nhất. Giữ riêng nguồn Garena và ghi chú cân bằng chính thức.',
      records,
    },
    evidence,
  };
}

export async function createFandomRefresh() {
  const heroes = JSON.parse(await readFile(resolve(root, 'public/data/heroes.json'), 'utf8'));
  const result = await collectFandom(heroes);
  const path = resolve(root, 'public/data/hero-wiki.json');
  const added = `${JSON.stringify(result.data, null, 2)}\n`;
  let previous;
  try { previous = await readFile(path, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const lines = text => text.trimEnd().split('\n');
  const hunk = previous === undefined
    ? `*** Add File: ${path}\n${lines(added).map(line => `+${line}`).join('\n')}\n`
    : `*** Update File: ${path}\n@@\n${lines(previous).map(line => `-${line}`).join('\n')}\n${lines(added).map(line => `+${line}`).join('\n')}\n`;
  return { ...result, patch: `*** Begin Patch\n${hunk}*** End Patch\n` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await createFandomRefresh();
  if (process.argv.includes('--patch')) process.stdout.write(result.patch);
  console.error(JSON.stringify({
    total: result.data.records.length,
    available: result.data.records.filter(record => record.status === 'available').length,
    missing: result.data.records.filter(record => record.status !== 'available').map(record => record.slug),
  }));
}
