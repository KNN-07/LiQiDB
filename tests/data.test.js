import { afterAll, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const names = ['heroes', 'items', 'runes', 'spells', 'meta', 'crawl-info', 'lore-vi', 'counters', 'season-meta', 'reference-builds', 'hero-wiki'];
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
      ['heroes', 'items', 'runes', 'spells', 'meta', 'lore-vi', 'counters', 'season-meta', 'reference-builds', 'hero-wiki'].map((name) => `./data/${name}.json`).sort(),
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

  test('grades supported mechanics separately from unresolved interactions', () => {
    expect(data.counterGuide.balanceDate).toBe(data.seasonMeta.balance.date);
    expect(data.counterGuide.scoreMethod.kind).toBe('editorial-ordinal');
    expect(data.counterGuide.scoreMethod.scale.map(grade => grade.score)).toEqual([1,2,3,4,5]);
    const all = [...data.matchups, ...data.counterGuide.unverifiedCandidates];
    expect(new Set(all.map(pair => `${pair.counter}:${pair.target}`)).size).toBe(all.length);
    for (const pair of all) {
      const analysis = pair.analysis;
      expect(new Set(analysis.evidence.map(evidence => evidence.hero))).toEqual(
        new Set([pair.counter, pair.target]),
      );
      for (const key of ['scenario','targetAction','response','causalLink','cost','scoreReason','nextGradeLimit','versionNote']) {
        expect(analysis[key].trim().length).toBeGreaterThan(0);
      }
      for (const key of ['setup','sequence','counterplay','mechanics']) {
        expect(analysis[key].length).toBeGreaterThan(0);
      }
      for (const evidence of analysis.evidence) {
        expect(new URL(evidence.url).protocol).toBe('https:');
        expect(evidence.fact.trim().length).toBeGreaterThan(0);
        expect(evidence.section.trim().length).toBeGreaterThan(0);
        if (evidence.source === 'fandom') {
          const wiki = data.heroWiki.records.find(record => record.slug === evidence.hero);
          expect(wiki.status).toBe('available');
          expect(evidence.revisionId).toBe(wiki.source.revisionId);
        }
      }
      if (pair.disposition === 'recommended') {
        expect(data.matchups).toContain(pair);
        expect(Number.isInteger(analysis.score)).toBe(true);
        expect(analysis.score).toBeGreaterThanOrEqual(1);
        expect(analysis.score).toBeLessThanOrEqual(5);
        expect(['high','medium','low']).toContain(analysis.confidence);
      } else {
        expect(data.matchups).not.toContain(pair);
        expect(analysis.score).toBeNull();
        expect(analysis.confidence).toBe('unrated');
      }
    }
    for (const [counter,target] of [['ata','bijan'],['chaugnar','darcy']]) {
      expect(data.matchups.find(pair => pair.counter === counter && pair.target === target)).toBeUndefined();
      expect(data.counterGuide.unverifiedCandidates.find(pair => pair.counter === counter && pair.target === target)?.analysis.score).toBeNull();
    }
  });

  test('returns both hero directions with descending scores and no invented pairs', () => {
    for (const hero of data.heroes) {
      const groups = data.getHeroMatchups(hero.slug);
      for (const [key,field] of [['incoming','target'],['outgoing','counter']]) {
        expect(groups[key].map(pair => `${pair.counter}:${pair.target}`).sort()).toEqual(
          data.matchups.filter(pair => pair[field] === hero.slug).map(pair => `${pair.counter}:${pair.target}`).sort(),
        );
        expect(groups[key].map(pair => pair.analysis.score)).toEqual(
          groups[key].map(pair => pair.analysis.score).sort((a,b)=>b-a),
        );
      }
      expect(groups.unverified).toEqual(data.counterGuide.unverifiedCandidates.filter(pair => pair.counter === hero.slug || pair.target === hero.slug));
    }
  });
});

describe('revisioned Vietnamese wiki details', () => {
  test('accounts for every local hero form without inventing missing pages', () => {
    expect(data.heroWiki).toEqual(snapshots['hero-wiki']);
    expect(data.heroWiki.locale).toBe('vi');
    expect(data.heroWiki.records.map(record => record.slug).sort()).toEqual(
      data.heroes.map(hero => hero.slug).sort(),
    );
    const available = data.heroWiki.records.filter(record => record.status === 'available');
    expect(available.length).toBeGreaterThan(0);
    for (const record of data.heroWiki.records) {
      expect(['available', 'missing', 'empty']).toContain(record.status);
      if (record.status === 'missing') {
        expect(record.sections).toEqual([]);
        expect(record.source).toBeUndefined();
        continue;
      }
      expect(record.source.revisionId).toBeGreaterThan(0);
      expect(record.source.pageId).toBeGreaterThan(0);
      expect(new URL(record.source.url).hostname).toBe('arenaofvalor.fandom.com');
      expect(new URL(record.source.revisionUrl).searchParams.get('oldid')).toBe(String(record.source.revisionId));
      expect(Number.isFinite(Date.parse(record.source.editedAt))).toBe(true);
      expect(record.source.textSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.source.renderedSha256).toMatch(/^[a-f0-9]{64}$/);
      for (const section of record.sections) {
        expect(section.anchor.length).toBeGreaterThan(0);
        for (const block of section.blocks) {
          expect(['paragraph', 'bullet', 'table']).toContain(block.kind);
          if (block.kind === 'table') {
            expect(block.rows.length).toBeGreaterThan(0);
            for (const row of block.rows) for (const cell of row) {
              expect(typeof cell.text).toBe('string');
              expect(typeof cell.header).toBe('boolean');
            }
          } else expect(block.text.trim().length).toBeGreaterThan(0);
        }
      }
    }
    const forms = ['flowborn', 'flowborn-2'].map(slug => data.heroWiki.records.find(record => record.slug === slug));
    expect(forms.every(record => record.status === 'available')).toBe(true);
    expect(forms[0].source.pageId).not.toBe(forms[1].source.pageId);
  });
});

describe('seasonal reference imports', () => {
  test('keeps published role tiers distinct and traceable', () => {
    const reference = data.seasonMeta;
    expect(reference).toEqual(snapshots['season-meta']);
    expect(reference.source.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(reference.source.dataSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(reference.source.dataDate < reference.balance.date).toBe(true);
    const slugs = new Set(data.heroes.map(hero => hero.slug));
    expect(new Set(reference.records.map(entry => entry.sourceId)).size).toBe(reference.records.length);
    for (const entry of reference.records) {
      expect(slugs.has(entry.slug)).toBe(true);
      expect(Object.keys(reference.lanes)).toContain(entry.lane);
      expect(['S', 'A', 'B', 'C', 'D']).toContain(entry.tier);
      expect(entry.score).toBeGreaterThanOrEqual(1);
      expect(entry.score).toBeLessThanOrEqual(5);
      if (entry.tournament) {
        expect(entry.tournament.games).toBe(reference.method.aogGames);
        expect(entry.tournament.winRate).toBeGreaterThanOrEqual(0);
        expect(entry.tournament.winRate).toBeLessThanOrEqual(100);
      }
    }
    expect(reference.records.some(entry => entry.slug === 'flowborn' && entry.lane === 'ad')).toBe(true);
    expect(reference.records.some(entry => entry.slug === 'flowborn-2' && entry.lane === 'mid')).toBe(true);
    expect(reference.records.some(entry => entry.slug === 'evita')).toBe(false);
  });

  test('resolves every lane build and supplementary catalog', () => {
    const reference = data.referenceBuilds;
    expect(reference).toEqual(snapshots['reference-builds']);
    expect(reference.source.commit).toBe(data.seasonMeta.source.commit);
    const slugs = new Set(data.heroes.map(hero => hero.slug));
    const items = new Set(reference.itemCatalog.map(item => item.slug));
    const arcana = new Set(reference.arcanaCatalog.map(item => item.slug));
    const spells = new Set(reference.spellCatalog.map(item => item.slug));
    expect(new Set(reference.records.map(entry => `${entry.slug}:${entry.lane}`)).size).toBe(reference.records.length);
    for (const entry of reference.records) {
      expect(slugs.has(entry.slug)).toBe(true);
      expect(new URL(entry.sourceUrl).protocol).toBe('https:');
      expect(entry.items.length).toBeGreaterThan(0);
      for (const item of entry.items) expect(items.has(item.id)).toBe(true);
      for (const rune of entry.arcana) {
        expect(arcana.has(rune.id)).toBe(true);
        expect(rune.count).toBeGreaterThan(0);
      }
      for (const spell of entry.spells) expect(spells.has(spell.id)).toBe(true);
    }
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
