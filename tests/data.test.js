import { afterAll, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const names = ['heroes', 'items', 'runes', 'spells', 'meta', 'crawl-info', 'lore-vi', 'counters'];
const snapshots = Object.fromEntries(await Promise.all(names.map(async (name) => [
  name,
  JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8')),
])));

// A project Pages site exposes data under its repository, not the domain root.
const server = Bun.serve({
  port: 0,
  fetch(request) {
    const name = new URL(request.url).pathname.match(/^\/LiQiDB\/data\/([\w-]+)\.json$/)?.[1];
    return name && snapshots[name] ? Response.json(snapshots[name]) : new Response(null, { status: 404 });
  },
});
const nativeFetch = globalThis.fetch;
const requested = [];
globalThis.fetch = (input, init) => {
  requested.push(input);
  return nativeFetch(new URL(input, new URL('LiQiDB/', server.url)), init);
};
let data;
try {
  data = await import('../src/data.js');
} finally {
  globalThis.fetch = nativeFetch;
}
afterAll(() => server.stop(true));

describe('pinned data integrity', () => {
  test('loads every collection without dropping record fields', () => {
    expect(requested.sort()).toEqual(
      ['heroes', 'items', 'runes', 'spells', 'meta', 'lore-vi', 'counters'].map((name) => `./data/${name}.json`).sort(),
    );
    for (const name of ['heroes', 'items', 'runes', 'spells']) {
      expect(data[name]).toEqual(snapshots[name]);
      expect(data[name].length).toBeGreaterThan(0);
      expect(data[name]).toHaveLength(data.meta.counts[name]);
      expect(new Set(data[name].map((record) => record.slug)).size).toBe(data[name].length);
      for (const record of data[name]) {
        expect(typeof record.name).toBe('string');
        expect(record.name.length).toBeGreaterThan(0);
        expect(record.slug).toBeTruthy();
      }
    }
  });

  test('metadata tracks the upstream commit and crawl dates', () => {
    expect(data.meta.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(data.meta.crawlInfo).toEqual(snapshots['crawl-info']);
    expect(data.meta.snapshotDate).toBe(
      Object.values(snapshots['crawl-info']).map((entry) => entry.crawledAt).sort().at(-1),
    );
    expect(Number.isFinite(Date.parse(data.meta.snapshotDate))).toBe(true);
  });

  test('real hero schema retains artwork skills stats and attribution', () => {
    for (const hero of data.heroes) {
      expect(Array.isArray(hero.classes)).toBe(true);
      expect(Array.isArray(hero.skills)).toBe(true);
      expect(Array.isArray(hero.stats)).toBe(true);
      expect(hero.sources.garena).toMatch(/^https:\/\//);
      expect(data.getArtwork(hero)).toBe(hero.skins[0].splash);
      for (const className of hero.classes) expect(data.roles[className]).toBeTruthy();
    }
    for (const name of ['items', 'runes', 'spells']) {
      for (const record of data[name]) expect(record.icon).toMatch(/^https:\/\//);
    }
  });
});

describe('Vietnamese lore snapshot', () => {
  test('covers the pinned source heroes without losing paragraphs', () => {
    expect(data.loreTranslation.locale).toBe('vi');
    expect(data.loreTranslation.sourceCommit).toBe(data.meta.commit);
    expect(data.loreTranslation.license).toBe('CC-BY-SA-3.0');
    const sourceHeroes = data.heroes.filter((hero) => hero.lore?.length);
    expect(Object.keys(data.loreVi).sort()).toEqual(sourceHeroes.map((hero) => hero.slug).sort());
    for (const hero of sourceHeroes) {
      expect(data.loreVi[hero.slug]).toHaveLength(hero.lore.length);
      expect(data.loreVi[hero.slug].every((paragraph) =>
        typeof paragraph === 'string' && paragraph.trim().length > 0,
      )).toBe(true);
    }
  });
});

describe('curated counter-pick guide', () => {
  test('retains directed valid hero pairs and source provenance', () => {
    expect(data.counterGuide).toEqual(snapshots.counters);
    expect(data.counterGuide.locale).toBe('vi');
    expect(Number.isFinite(Date.parse(data.counterGuide.reviewedAt))).toBe(true);
    expect(data.matchups.length).toBeGreaterThan(0);
    expect(new Set(data.matchups.map(pair => `${pair.counter}:${pair.target}`)).size).toBe(data.matchups.length);
    const slugs = new Set(data.heroes.map(hero => hero.slug));
    for (const pair of data.matchups) {
      expect(slugs.has(pair.counter)).toBe(true);
      expect(slugs.has(pair.target)).toBe(true);
      expect(pair.counter).not.toBe(pair.target);
      expect(['explicit', 'mechanics']).toContain(pair.basis);
      expect(pair.reason.trim().length).toBeGreaterThan(0);
      expect(pair.limitation.trim().length).toBeGreaterThan(0);
      expect(pair.sources.length).toBeGreaterThanOrEqual(2);
      for (const source of pair.sources) expect(new URL(source.url).protocol).toBe('https:');
    }
  });

  test('finds either participant without reversing matchup direction', () => {
    const pair = data.matchups.find(pair => pair.target === 'lu-bo');
    expect(pair).toBeDefined();
    expect(data.filterMatchups('LỮ BỐ')).toContain(pair);
    expect(data.filterMatchups('lu bo')).toContain(pair);
    expect(data.filterMatchups(data.heroes.find(hero => hero.slug === pair.counter).name)).toContain(pair);
    expect(data.filterMatchups('')).toEqual(data.matchups);
    expect(data.filterMatchups('no-such-matchup')).toEqual([]);
  });
});

describe('search and artwork helpers', () => {
  test('normalizes Vietnamese accents including crossed d and combining marks', () => {
    expect(data.normalize('  ĐỠ ĐÒN  ')).toBe('do don');
    expect(data.normalize('Đấu sĩ'.normalize('NFD'))).toBe('dau si');
    expect(data.normalize(null)).toBe('');
  });

  test('finds real accented names and titles', () => {
    const item = data.items.find((record) => record.slug === 'chuy-bang-suong');
    expect(data.filterRecords(data.items, 'CHUY BANG SUONG')).toContain(item);
    const airi = data.heroes.find((hero) => hero.slug === 'airi');
    expect(data.filterRecords(data.heroes, 'ninja rong')).toContain(airi);
    expect(data.filterRecords(data.spells, 'toc bien').map((record) => record.slug)).toEqual(['toc-bien']);
  });

  test('filters Vietnamese and English classes together with the query', () => {
    const tanks = data.heroes.filter((hero) => hero.classes.includes('Đỡ đòn'));
    expect(data.filterRecords(data.heroes, 'do don')).toEqual(tanks);
    expect(data.filterRecords(data.heroes, '', 'Tank')).toEqual(tanks);
    expect(data.filterRecords(data.heroes, '', 'Đỡ đòn')).toEqual(tanks);
    expect(data.filterRecords(data.heroes, 'airi', 'Assassin').map((hero) => hero.slug)).toEqual(['airi']);
    expect(data.filterRecords(data.heroes, 'airi', 'Tank')).toEqual([]);
    expect(data.filterRecords(data.items, '')).toEqual(data.items);
    expect(data.filterRecords(data.heroes, 'nonexistent record')).toEqual([]);
  });

  test('chooses splash before thumbnail and falls back to record images', () => {
    expect(data.getArtwork({ skins: [{ splash: 'splash', thumb: 'thumb' }], image: 'image' })).toBe('splash');
    expect(data.getArtwork({ skins: [{ thumb: 'thumb' }], image: 'image' })).toBe('thumb');
    expect(data.getArtwork({ thumb: 'thumb', image: 'image' })).toBe('thumb');
    expect(data.getArtwork({ image: 'image', icon: 'icon' })).toBe('image');
    expect(data.getArtwork({ icon: 'icon' })).toBe('icon');
    expect(data.getArtwork({ portrait: 'portrait' })).toBe('portrait');
    expect(data.getArtwork({})).toBe('');
  });
});
