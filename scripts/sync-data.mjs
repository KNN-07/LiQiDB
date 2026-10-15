import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const repository = 'MLuc24/lien-quan-data';
const root = fileURLToPath(new URL('../', import.meta.url));
const collections = ['heroes', 'items', 'runes', 'spells'];

async function download(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.text();
}

// Return a patch so agent environments can use their apply_patch tool directly.
export async function createRefreshPatch(revision = 'main') {
  const info = JSON.parse(await download(
    `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(revision)}`,
  ));
  if (!/^[a-f0-9]{40}$/.test(info.sha)) throw new Error('Invalid upstream commit SHA');
  const commit = info.sha;
  const downloads = await Promise.all([...collections, 'crawl-info'].map(async (name) => {
    const text = await download(
      `https://raw.githubusercontent.com/${repository}/${commit}/data/${name}.json`,
    );
    return { name, text, value: JSON.parse(text) };
  }));
  const counts = {};
  for (const name of collections) {
    const records = downloads.find((entry) => entry.name === name).value;
    if (!Array.isArray(records) || !records.length ||
        records.some((record) => !record.slug || !record.name) ||
        new Set(records.map((record) => record.slug)).size !== records.length) {
      throw new Error(`Invalid ${name} collection`);
    }
    counts[name] = records.length;
  }
  const crawlInfo = downloads.find((entry) => entry.name === 'crawl-info').value;
  const dates = Object.values(crawlInfo).map((entry) => entry.crawledAt).sort();
  if (!dates.length || dates.some((date) => !Number.isFinite(Date.parse(date)))) {
    throw new Error('Invalid crawl dates');
  }
  const meta = {
    source: `https://github.com/${repository}`,
    branch: 'main',
    commit,
    snapshotDate: dates.at(-1),
    crawlInfo,
    counts,
  };
  downloads.push({ name: 'meta', text: `${JSON.stringify(meta, null, 2)}\n` });

  const changes = [];
  for (const { name, text } of downloads) {
    const path = resolve(root, 'public/data', `${name}.json`);
    let previous;
    try {
      previous = await readFile(path, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Patch files have a terminating newline, including upstream crawl-info.
    const next = `${text.replace(/\n$/, '')}\n`;
    if (previous === next) continue;
    const added = next.replace(/\n$/, '').split('\n').map((line) => `+${line}`).join('\n');
    if (previous === undefined) {
      changes.push(`*** Add File: ${path}\n${added}\n`);
    } else {
      const removed = previous.replace(/\n$/, '').split('\n').map((line) => `-${line}`).join('\n');
      changes.push(`*** Update File: ${path}\n@@\n${removed}\n${added}\n`);
    }
  }
  return { patch: changes.length ? `*** Begin Patch\n${changes.join('')}*** End Patch\n` : '', meta };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const result = await createRefreshPatch(args.find((arg) => arg !== '--patch') ?? 'main');
  if (args.includes('--patch')) {
    process.stdout.write(result.patch);
  } else if (result.patch) {
    const child = spawn('apply_patch', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    const complete = new Promise((accept, reject) => {
      child.once('error', reject);
      child.stdin.once('error', reject);
      child.once('exit', (code) => code === 0 ? accept() : reject(new Error(`apply_patch exited ${code}`)));
    });
    child.stdin.end(result.patch);
    await complete;
  }
  console.error(JSON.stringify(result.meta, null, 2));
}
