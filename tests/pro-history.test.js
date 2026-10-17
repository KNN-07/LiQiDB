import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { coverageReport, mapHeroes, normalizeHistory, normalizeName, snapshotPatch, validateSnapshot } from '../scripts/crawl-pro-history.mjs';

function fixture() {
  const heroes = Array.from({ length: 11 }, (_, i) => ({ id: `h${i}`, name: `Hero ${i}` }));
  const local = heroes.slice(0, 10).map(h => ({ ...h, slug: h.id }));
  const matches = [{
    id: 'm', match_date: '2017-04-08T12:00:00+00:00', team_1_id: 'a', team_2_id: 'b',
    team_1: { id: 'a', name: 'Alpha' }, team_2: { id: 'b', name: 'Beta' }, tournament: { name: 'Cup' },
  }];
  const game = {
    id: 'g', match_id: 'm', game_number: 1, winner_team_id: 'a',
    blue_side_team_id: 'b', red_side_team_id: 'a', pick_order_verified: false,
    match: { id: 'm', match_date: matches[0].match_date },
    game_picks: Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`, game_id: 'g', hero_id: `h${i}`, team_id: i < 5 ? 'b' : 'a',
      action: 'pick', pick_order: 5 - i % 5,
      player_id: i === 0 ? 'player' : null,
      player: i === 0 ? { id: 'player', ingame_name: 'Pro' } : null,
    })),
  };
  return {
    raw: { heroes, matches, games: [game] }, local,
    source: { name: 'Fixture', url: 'https://example.test', retrievedAt: '2026-10-17T00:00:00Z', counts: { allGames: 1, allMatches: 1, draftRows: 10 }, notes: [], rawHashes: {} },
  };
}
const build = f => normalizeHistory(f.raw, f.local, f.source);

describe('public professional history parser', () => {
  test('normalizes exact regional aliases without merging legacy replacements', () => {
    expect(normalizeName('Điêu Thuyền')).toBe('dieuthuyen');
    const source = ['Riktor', 'Diao Chan', 'Jinnar', 'Payna', 'Helen', 'Batman', 'Kaine', 'The Joker', 'Stuart', 'Flowborn (Mage)', 'Flowborn (Marksman)'].map((name, i) => ({ id: String(i), name }));
    const local = ['Richter', 'Điêu Thuyền', 'Jinna', 'Helen', 'Kaine', 'Stuart'].map(name => ({ name, slug: name }));
    local.push({ name: 'Flowborn', slug: 'mage', classes: ['Pháp sư'] }, { name: 'Flowborn', slug: 'adc', classes: ['Xạ thủ'] });
    expect(mapHeroes(source, local).map(h => h.slug)).toEqual(['Richter', 'Điêu Thuyền', 'Jinna', null, 'Helen', null, 'Kaine', null, 'Stuart', 'mage', 'adc']);
    expect(() => mapHeroes([{ id: '1', name: 'Jinnar' }, { id: '2', name: 'Jinna' }], [{ name: 'Jinna', slug: 'jinna' }])).toThrow('Non-bijective');
    expect(() => mapHeroes([{ id: '1', name: 'A' }], [{ name: 'A', slug: 'a' }, { name: 'A', slug: 'b' }])).toThrow('Ambiguous');
    expect(mapHeroes([{ id: '1', name: 'Sikong Zhen' }], [{ name: 'Bolt Baron', slug: 'bolt-baron' }])[0].slug).toBeNull();
  });

  test('uses actual blue/red teams, winner, direct players, and per-side order', () => {
    const s = build(fixture()), g = s.games[0];
    expect(s.teams[g.blueTeam].id).toBe('b');
    expect(s.teams[g.redTeam].id).toBe('a');
    expect(g.winner).toBe('red');
    expect(g.blue).toEqual([4, 3, 2, 1, 0]);
    expect(g.bluePlayers).toEqual([null, null, null, null, 0]);
    expect(g.redPlayers).toEqual([null, null, null, null, null]);
    expect(g.orderVerified).toBe(false);
    expect(s.matches[0].date).toBe('2017-04-08T12:00:00+00:00');
  });

  test('retains unmapped source heroes, bans, and zero-game series', () => {
    const f = fixture();
    f.raw.games[0].game_picks[0].hero_id = 'h10';
    f.raw.games[0].game_picks.push({ id: 'ban', game_id: 'g', hero_id: 'h0', team_id: 'a', action: 'ban', pick_order: 1 });
    f.raw.matches.push({ ...f.raw.matches[0], id: 'zero' });
    f.source.counts.allMatches++;
    f.source.counts.draftRows++;
    const s = build(f);
    expect(s.games).toHaveLength(1);
    expect(s.heroes[s.games[0].blue[4]].slug).toBeNull();
    expect(s.games[0].redBans).toEqual([0]);
    expect(s.matches).toHaveLength(2);
    expect(s.unmatchedHeroes).toEqual([{ id: 'h10', name: 'Hero 10' }]);
  });

  test('records missing drafts and every excluded identity without inventing data', () => {
    const f = fixture();
    f.raw.games[0].game_picks = [];
    f.source.counts.draftRows = 0;
    const s = build(f);
    expect(s.games).toHaveLength(0);
    expect(s.excludedGames[0].id).toBe('g');
    expect(s.excludedGames[0].reason).toContain('missing drafts');
    expect(s.source.counts.missingDraftGames).toBe(1);
  });

  test('retains anomalous same-team series but excludes their invalid games', () => {
    const f = fixture(), m = f.raw.matches[0];
    m.team_2_id = m.team_1_id;
    m.team_2 = m.team_1;
    const s = build(f);
    expect(s.matches).toHaveLength(1);
    expect(s.matches[0].team1).toBe(s.matches[0].team2);
    expect(s.games).toHaveLength(0);
    expect(s.excludedGames[0].reason).toContain('invalid side teams');
  });

  test('valid game sides survive inconsistent series team metadata', () => {
    const f = fixture();
    f.raw.teams = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }];
    f.raw.matches[0].team_2_id = 'a';
    f.raw.matches[0].team_2 = f.raw.matches[0].team_1;
    expect(build(f).games).toHaveLength(1);
  });

  test('observed history dates exclude zero-game upcoming series', () => {
    const f = fixture();
    f.raw.matches.push({ ...f.raw.matches[0], id: 'future', match_date: '2030-01-01T00:00:00Z' });
    f.source.counts.allMatches++;
    const s = build(f);
    expect(s.matches).toHaveLength(2);
    expect(s.source.dateRange).toEqual({ from: f.raw.matches[0].match_date, to: f.raw.matches[0].match_date });
  });

  test.each(['hero', 'winner', 'team', 'incomplete', 'duplicateHero'])('excludes invalid %s rows', kind => {
    const f = fixture(), g = f.raw.games[0];
    if (kind === 'hero') g.game_picks[0].hero_id = null;
    if (kind === 'winner') g.winner_team_id = 'unknown';
    if (kind === 'team') g.game_picks[0].team_id = 'unknown';
    if (kind === 'incomplete') { g.game_picks.pop(); f.source.counts.draftRows--; }
    if (kind === 'duplicateHero') g.game_picks[0].hero_id = 'h1';
    expect(build(f).excludedGames.map(g => g.id)).toEqual(['g']);
  });

  test('duplicate order uses stable row IDs and never promotes verification', () => {
    const f = fixture();
    for (const row of f.raw.games[0].game_picks) row.pick_order = 1;
    f.raw.games[0].game_picks.reverse();
    const g = build(f).games[0];
    expect(g.blue).toEqual([0, 1, 2, 3, 4]);
    expect(g.orderVerified).toBe(false);
  });

  test('rejects duplicate game, series/game, draft, and mismatched identities', () => {
    const f = fixture();
    f.raw.games.push(structuredClone(f.raw.games[0]));
    f.source.counts.allGames++;
    expect(() => build(f)).toThrow('duplicate game');
    f.raw.games[1].id = 'g2';
    f.raw.games[1].game_picks = [];
    expect(() => build(f)).toThrow('Duplicate match/game');
    const d = fixture();
    d.raw.games[0].game_picks[1].id = 'p0';
    expect(() => build(d)).toThrow('Duplicate draft');
    const p = fixture();
    p.raw.games[0].game_picks[0].game_id = 'other';
    expect(() => build(p)).toThrow('Draft game identity');
    p.raw.games[0].game_picks[0].game_id = 'g';
    p.raw.games[0].game_picks[0].player.id = 'other';
    expect(() => build(p)).toThrow('Player identity');
  });

  test('fails rather than publishing partial counts or invalid indices', () => {
    const f = fixture();
    f.source.counts.draftRows++;
    expect(() => build(f)).toThrow('Draft count');
    const s = build(fixture());
    s.games[0].blue[0] = s.heroes.length;
    expect(() => validateSnapshot(s)).toThrow('hero index');
    const t = build(fixture());
    t.source.counts.allGames++;
    expect(() => validateSnapshot(t)).toThrow('Coverage count');
  });

  test('reports per-hero missing coverage and produces snapshot patches', () => {
    const f = fixture(), s = build(f);
    const report = coverageReport(s, [...f.local, { slug: 'absent', name: 'Absent' }]);
    expect(report.sourceHeroesWithoutPicks.map(h => h.id)).toEqual(['h10']);
    expect(report.localHeroesWithoutSource).toEqual([{ slug: 'absent', name: 'Absent' }]);
    expect(report.perLocalHero.find(h => h.slug === 'absent')).toMatchObject({ validGames: 0, coverage: 'missing-source' });
    expect(report.perLocalHero.find(h => h.slug === 'h0')).toMatchObject({ validGames: 1, coverage: 'observed' });
    expect(report.perHero.reduce((n, h) => n + h.picks, 0)).toBe(10);
    const patch = snapshotPatch(s, report);
    expect(patch.startsWith('*** Begin Patch\n*** Add File: public/data/pro-history.json\n+')).toBe(true);
    expect(patch.endsWith('*** End Patch\n')).toBe(true);
  });

  test('distinguishes a mapped hero with no usable games from a missing source hero', () => {
    const f = fixture();
    f.local.push({ name: 'Hero 10', slug: 'h10' });
    const report = coverageReport(build(f), f.local);
    expect(report.perLocalHero.find(h => h.slug === 'h10')).toMatchObject({ validGames: 0, coverage: 'zero-usable-games', sourceId: 'h10' });
    expect(report.localHeroesWithoutSource).toEqual([]);
  });
});

test('published snapshot reconciles all game, match, and hero coverage without network', async () => {
  const s = JSON.parse(await readFile(new URL('../public/data/pro-history.json', import.meta.url), 'utf8'));
  expect(validateSnapshot(s)).toBe(true);
  expect(s.source.counts.draftRows).toBeGreaterThan(0);
  expect(s.source.counts.allGames).toBeGreaterThan(10000);
  const local = JSON.parse(await readFile(new URL('../public/data/heroes.json', import.meta.url), 'utf8'));
  const report = coverageReport(s, local);
  expect(report.source.counts).toEqual(s.source.counts);
  expect(report.perHero.reduce((n, h) => n + h.picks, 0)).toBe(s.games.length * 10);
});
