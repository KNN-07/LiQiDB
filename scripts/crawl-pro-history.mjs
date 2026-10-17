import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://aovdata.vercel.app';
const GAME_SELECT = '*,game_picks(*,hero:heroes(name),player:players!player_id(id,ingame_name)),match:matches!inner(id,match_date,tournament_id,team_1_id,team_2_id,score_1,score_2,tournament:tournaments(name))';
const MATCH_SELECT = 'id,match_date,team_1_id,team_2_id,team_1:teams!team_1_id(id,name),team_2:teams!team_2_id(id,name),tournament:tournaments(name)';
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const normalizeName = name => name.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

// Reviewed regional names, not successor/replacement hero identities.
const ALIASES = {
  riktor: 'richter', diaochan: 'dieuthuyen', jinnar: 'jinna',
  wukong: 'ngokhong', zanis: 'trieuvan', lubu: 'lubo',
  wirosableng: 'wiro',
};

export function mapHeroes(source, local) {
  const used = new Set();
  assert(new Set(source.map(h => h.id)).size === source.length, 'Duplicate source hero ID');
  return source.map(hero => {
    const name = normalizeName(hero.name);
    const candidates = local.filter(h => {
      if (name === 'flowbornmage' || name === 'flowbornmarksman') {
        const role = name === 'flowbornmage' ? 'phapsu' : 'xathu';
        return normalizeName(h.name) === 'flowborn' && h.classes?.some(c => normalizeName(c) === role);
      }
      return normalizeName(h.name) === (ALIASES[name] ?? name);
    });
    assert(candidates.length <= 1, `Ambiguous local mapping: ${hero.name}`);
    const slug = candidates[0]?.slug ?? null;
    assert(slug === null || !used.has(slug), `Non-bijective local mapping: ${hero.name}`);
    if (slug !== null) used.add(slug);
    return { id: hero.id, name: hero.name, slug };
  });
}

function unique(records, label) {
  const ids = new Set();
  for (const row of records) {
    assert(typeof row.id === 'string' && row.id.length > 0 && !ids.has(row.id), `Invalid/duplicate ${label} ID: ${row.id}`);
    ids.add(row.id);
  }
}

export function normalizeHistory(raw, local, source) {
  unique(raw.games, 'game');
  unique(raw.matches, 'match');
  unique(raw.heroes, 'hero');
  assert(raw.games.length === source.counts.allGames, 'Game count reconciliation failed');
  assert(raw.matches.length === source.counts.allMatches, 'Match count reconciliation failed');
  const heroes = mapHeroes(raw.heroes, local);
  const heroIndex = new Map(heroes.map((h, i) => [h.id, i]));
  const teams = [], players = [];
  const teamIndex = new Map(), playerIndex = new Map();
  const register = (rows, index, id, name) => {
    assert(typeof id === 'string' && typeof name === 'string', 'Invalid registry identity');
    if (!index.has(id)) { index.set(id, rows.length); rows.push({ id, name }); }
    else assert(rows[index.get(id)].name === name, `Conflicting registry name: ${id}`);
    return index.get(id);
  };
  for (const team of raw.teams ?? []) register(teams, teamIndex, team.id, team.name);
  const matches = raw.matches.map(m => {
    assert(m.team_1?.id === m.team_1_id && m.team_2?.id === m.team_2_id, `Missing match team: ${m.id}`);
    assert(typeof m.match_date === 'string' && Number.isFinite(Date.parse(m.match_date)), `Invalid source date: ${m.id}`);
    return {
      id: m.id, date: m.match_date, tournament: m.tournament?.name ?? null,
      team1: register(teams, teamIndex, m.team_1_id, m.team_1.name),
      team2: register(teams, teamIndex, m.team_2_id, m.team_2.name),
    };
  });
  const matchIndex = new Map(matches.map((m, i) => [m.id, i]));
  const games = [], excludedGames = [], draftIds = new Set(), identities = new Set();
  let draftRows = 0, missingDraftGames = 0;
  for (const game of raw.games) {
    assert(Array.isArray(game.game_picks), `Invalid draft response: ${game.id}`);
    const rows = game.game_picks;
    draftRows += rows.length;
    for (const row of rows) {
      assert(typeof row.id === 'string' && !draftIds.has(row.id), `Duplicate draft ID: ${row.id}`);
      assert(row.game_id === game.id, `Draft game identity mismatch: ${row.id}`);
      draftIds.add(row.id);
      if (row.player_id && row.player) {
        assert(row.player.id === row.player_id, `Player identity mismatch: ${row.id}`);
        register(players, playerIndex, row.player_id, row.player.ingame_name);
      }
    }
    const reasons = [];
    if (!rows.length) { reasons.push('missing drafts'); missingDraftGames++; }
    const mi = matchIndex.get(game.match_id);
    const match = raw.matches[mi];
    if (!match || game.match?.id !== game.match_id) reasons.push('missing or inconsistent match');
    else if (game.match.match_date !== match.match_date) reasons.push('inconsistent source match date');
    const blueId = game.blue_side_team_id, redId = game.red_side_team_id;
    if (!blueId || !redId || blueId === redId || !teamIndex.has(blueId) || !teamIndex.has(redId)) reasons.push('invalid side teams');
    if (![blueId, redId].includes(game.winner_team_id) || !game.winner_team_id) reasons.push('invalid winner');
    if (!Number.isInteger(game.game_number) || game.game_number < 1) reasons.push('invalid game number');
    const identity = `${game.match_id}/${game.game_number}`;
    assert(!identities.has(identity), `Duplicate match/game identity: ${identity}`);
    identities.add(identity);
    if (rows.some(r => !['pick', 'ban'].includes(r.action))) reasons.push('invalid draft action');
    if (rows.some(r => !r.hero_id || !heroIndex.has(r.hero_id))) reasons.push('missing or unknown hero');
    if (rows.some(r => ![blueId, redId].includes(r.team_id))) reasons.push('invalid draft team');
    const blue = rows.filter(r => r.action === 'pick' && r.team_id === blueId);
    const red = rows.filter(r => r.action === 'pick' && r.team_id === redId);
    if (blue.length !== 5 || red.length !== 5) reasons.push(`incomplete picks (${blue.length}/${red.length})`);
    if (new Set([...blue, ...red].map(r => r.hero_id)).size !== 10) reasons.push('non-distinct picks');
    if (reasons.length) { excludedGames.push({ id: game.id, reason: reasons.join('; ') }); continue; }
    const ordered = side => {
      const hasOrder = side.every(r => Number.isInteger(r.pick_order)) && new Set(side.map(r => r.pick_order)).size === side.length;
      // ID order is the deterministic source-row fallback, not chronological pick order.
      return [...side].sort(hasOrder ? (a, b) => a.pick_order - b.pick_order : (a, b) => a.id.localeCompare(b.id));
    };
    const b = ordered(blue), r = ordered(red);
    games.push({
      id: game.id, match: mi, number: game.game_number,
      blueTeam: teamIndex.get(blueId), redTeam: teamIndex.get(redId),
      winner: game.winner_team_id === blueId ? 'blue' : 'red',
      blue: b.map(p => heroIndex.get(p.hero_id)), red: r.map(p => heroIndex.get(p.hero_id)),
      bluePlayers: b.map(p => playerIndex.get(p.player_id) ?? null),
      redPlayers: r.map(p => playerIndex.get(p.player_id) ?? null),
      blueBans: ordered(rows.filter(p => p.action === 'ban' && p.team_id === blueId)).map(p => heroIndex.get(p.hero_id)),
      redBans: ordered(rows.filter(p => p.action === 'ban' && p.team_id === redId)).map(p => heroIndex.get(p.hero_id)),
      orderVerified: game.pick_order_verified === true,
    });
  }
  assert(draftRows === source.counts.draftRows, `Draft count reconciliation failed: ${draftRows}/${source.counts.draftRows}`);
  const dates = games.map(g => matches[g.match].date).sort((a, b) => Date.parse(a) - Date.parse(b));
  const snapshot = {
    schemaVersion: 1,
    source: {
      ...source,
      counts: {
        ...source.counts, usableGames: games.length, excludedGames: excludedGames.length,
        missingDraftGames, verifiedOrderGames: games.filter(g => g.orderVerified).length,
        sourceHeroes: heroes.length, mappedHeroes: heroes.filter(h => h.slug !== null).length,
      },
      dateRange: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
    },
    heroes, players, teams, matches, games, excludedGames,
    unmatchedHeroes: heroes.filter(h => h.slug === null).map(({ id, name }) => ({ id, name })),
  };
  validateSnapshot(snapshot);
  return snapshot;
}

export function validateSnapshot(s) {
  assert(s.schemaVersion === 1, 'Invalid schema version');
  for (const key of ['heroes', 'players', 'teams', 'matches', 'games', 'excludedGames']) unique(s[key], key);
  unique([...s.games, ...s.excludedGames], 'coverage');
  const index = (n, rows) => Number.isInteger(n) && n >= 0 && n < rows.length;
  const slugs = s.heroes.filter(h => h.slug !== null).map(h => h.slug);
  assert(new Set(slugs).size === slugs.length, 'Duplicate hero slug');
  for (const m of s.matches) assert(index(m.team1, s.teams) && index(m.team2, s.teams), 'Invalid match team index');
  const identities = new Set();
  for (const g of s.games) {
    assert(index(g.match, s.matches), 'Invalid match index');
    assert(index(g.blueTeam, s.teams) && index(g.redTeam, s.teams) && g.blueTeam !== g.redTeam, 'Invalid game sides');
    assert(['blue', 'red'].includes(g.winner), 'Invalid winner');
    assert(Number.isInteger(g.number) && g.number > 0, 'Invalid game number');
    const identity = `${g.match}/${g.number}`;
    assert(!identities.has(identity), 'Duplicate match/game identity');
    identities.add(identity);
    assert(g.blue.length === 5 && g.red.length === 5 && new Set([...g.blue, ...g.red]).size === 10, 'Invalid five-hero sides');
    for (const n of [...g.blue, ...g.red, ...g.blueBans, ...g.redBans]) assert(index(n, s.heroes), 'Invalid hero index');
    for (const side of [g.bluePlayers, g.redPlayers]) assert(side.length === 5 && side.every(n => n === null || index(n, s.players)), 'Invalid player index');
    assert(typeof g.orderVerified === 'boolean', 'Invalid order flag');
  }
  const c = s.source.counts;
  assert(c.allGames === s.games.length + s.excludedGames.length && c.allMatches === s.matches.length &&
    c.usableGames === s.games.length && c.excludedGames === s.excludedGames.length &&
    c.sourceHeroes === s.heroes.length && c.mappedHeroes === slugs.length &&
    c.verifiedOrderGames === s.games.filter(g => g.orderVerified).length, 'Coverage count mismatch');
  assert(s.excludedGames.every(g => typeof g.reason === 'string' && g.reason.length), 'Missing exclusion reason');
  const dates = s.games.map(g => s.matches[g.match].date).sort((a, b) => Date.parse(a) - Date.parse(b));
  assert(s.source.dateRange.from === (dates[0] ?? null) && s.source.dateRange.to === (dates.at(-1) ?? null), 'Observed game date range mismatch');
  assert(JSON.stringify(s.unmatchedHeroes) === JSON.stringify(s.heroes.filter(h => h.slug === null).map(({ id, name }) => ({ id, name }))), 'Unmatched coverage mismatch');
  return true;
}

export function coverageReport(snapshot, local) {
  const perHero = snapshot.heroes.map(h => ({ ...h, picks: 0, bans: 0, from: null, to: null }));
  const usedMatches = new Set();
  for (const game of snapshot.games) {
    usedMatches.add(game.match);
    const date = snapshot.matches[game.match].date;
    for (const i of [...game.blue, ...game.red]) {
      const row = perHero[i];
      row.picks++;
      if (row.from === null || Date.parse(date) < Date.parse(row.from)) row.from = date;
      if (row.to === null || Date.parse(date) > Date.parse(row.to)) row.to = date;
    }
    for (const i of [...game.blueBans, ...game.redBans]) perHero[i].bans++;
  }
  const reasons = {};
  for (const g of snapshot.excludedGames) for (const reason of g.reason.split('; ')) reasons[reason] = (reasons[reason] ?? 0) + 1;
  return {
    schemaVersion: 1, source: snapshot.source, perHero,
    mappingReview: [{
      sourceName: 'Sikong Zhen', candidateSlug: 'bolt-baron', decision: 'unmapped',
      reason: 'No verified same-playable-hero source identity; counterpart similarity is insufficient. Source history remains retained with a null slug.',
    }],
    perLocalHero: local.map(({ slug, name }) => {
      const source = perHero.find(h => h.slug === slug);
      return {
        slug, name, sourceId: source?.id ?? null, sourceName: source?.name ?? null,
        validGames: source?.picks ?? 0, bans: source?.bans ?? 0,
        from: source?.from ?? null, to: source?.to ?? null,
        coverage: !source ? 'missing-source' : source.picks ? 'observed' : 'zero-usable-games',
      };
    }),
    sourceHeroesWithoutPicks: perHero.filter(h => !h.picks),
    localHeroesWithoutSource: local.filter(h => !snapshot.heroes.some(s => s.slug === h.slug)).map(({ slug, name }) => ({ slug, name })),
    mappedHeroesWithoutPicks: perHero.filter(h => h.slug !== null && !h.picks),
    exclusionReasons: reasons,
    matchesWithoutUsableGames: snapshot.matches.filter((_, i) => !usedMatches.has(i)).map(m => m.id),
    unknownPlayerSlots: snapshot.games.reduce((n, g) => n + [...g.bluePlayers, ...g.redPlayers].filter(p => p === null).length, 0),
    reconciliation: { games: true, matches: true, draftRows: true, uniqueGameIds: true, uniqueDraftIds: true },
  };
}

export function snapshotPatch(snapshot, report, existing = new Set()) {
  const files = {
    'public/data/pro-history.json': snapshot,
    '.omo/evidence/multi-counter/crawl-report.json': report,
  };
  return '*** Begin Patch\n' + Object.entries(files).map(([path, value]) =>
    `${existing.has(path) ? `*** Delete File: ${path}\n` : ''}*** Add File: ${path}\n+${JSON.stringify(value)}\n`,
  ).join('') + '*** End Patch\n';
}

export async function crawl({ cache, progress = message => console.error(message) } = {}) {
  if (cache) await mkdir(cache, { recursive: true });
  const rawHashes = {};
  const cached = async (name, get) => {
    const path = cache && join(cache, name + '.json');
    let text;
    if (path) {
      try { text = await readFile(path, 'utf8'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (text === undefined) {
      text = await get();
      JSON.parse(text);
      if (path) await writeFile(path, text);
    }
    rawHashes[name] = hash(text);
    return JSON.parse(text);
  };
  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(90000) });
    assert(response.ok, `Public request failed (${response.status}): ${new URL(url).pathname}`);
    return response;
  };
  const html = await (await request(SITE + '/heroes')).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => new URL(m[1], SITE).href);
  let endpoint, key, configURL;
  for (const url of scripts) {
    const text = await (await request(url)).text();
    endpoint = text.match(/https:\/\/[a-z]+\.supabase\.co/)?.[0];
    key = text.match(/sb_publishable_[\w-]+/)?.[0] ?? text.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)?.[0];
    if (endpoint && key) { configURL = url; break; }
  }
  assert(endpoint && key, 'Public configuration was not found in linked scripts');
  // Configuration credentials only exist in memory, never cache files, output or errors.
  const query = (table, params) => endpoint + '/rest/v1/' + table + '?' + new URLSearchParams(params);
  const headers = { apikey: key };
  const count = async table => {
    const response = await request(query(table, { select: 'id' }), { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' } });
    const total = response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
    assert(total !== undefined, `Missing exact count: ${table}`);
    return Number(total);
  };
  const counts = { allGames: await count('games'), allMatches: await count('matches'), draftRows: await count('game_picks') };
  const fingerprint = hash({ counts, endpoint, GAME_SELECT, MATCH_SELECT });
  if (cache) {
    const path = join(cache, 'receipt.json');
    let previous;
    try { previous = JSON.parse(await readFile(path, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert(!previous || previous.fingerprint === fingerprint, 'Cache source/counts changed; use a fresh --cache directory');
    await writeFile(path, JSON.stringify({ fingerprint, counts, startedAt: previous?.startedAt ?? new Date().toISOString() }));
  }
  progress(`Exact public counts: ${JSON.stringify(counts)}`);
  const pages = async (table, select) => {
    const all = [];
    let last = '';
    for (;;) {
      const params = { select, order: 'id.asc', limit: '100', ...(last ? { id: 'gt.' + last } : {}) };
      const rows = await cached(`${table}-${last || 'start'}`, async () => (await request(query(table, params), { headers })).text());
      assert(Array.isArray(rows), `Invalid public page: ${table}`);
      if (!rows.length) break;
      for (const row of rows) {
        assert(typeof row.id === 'string' && row.id > last, `Non-increasing keyset: ${table}`);
        last = row.id;
      }
      all.push(...rows);
      progress(`${table}: ${all.length}`);
    }
    return all;
  };
  const heroes = await pages('heroes', 'id,name');
  const analytics = await cached('analytics-roster', async () => {
    const data = await (await request(SITE + '/api/heroes/analytics')).json();
    assert(data.success && Array.isArray(data.heroes), 'Invalid analytics roster');
    return JSON.stringify(data.heroes.map(({ id, name }) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id)));
  });
  assert(JSON.stringify(heroes) === JSON.stringify(analytics), 'Public table and profile hero rosters differ');
  const matches = await pages('matches', MATCH_SELECT);
  const teams = await pages('teams', 'id,name');
  const games = await pages('games', GAME_SELECT);
  const after = { allGames: await count('games'), allMatches: await count('matches'), draftRows: await count('game_picks') };
  assert(JSON.stringify(counts) === JSON.stringify(after), 'Source counts changed during crawl; use a fresh cache');
  const local = JSON.parse(await readFile(new URL('../public/data/heroes.json', import.meta.url), 'utf8'));
  const source = {
    name: 'AOV Esports Analytics', url: SITE + '/heroes', retrievedAt: new Date().toISOString(), counts,
    notes: [
      'All public series are retained, including series without games and upcoming series. Dates are verbatim source match dates; dateRange describes usable observed games only.',
      'Only complete ten-distinct-hero games with valid sides and winners are usable. All other source game IDs and reasons are retained.',
      'Per-side pick_order is used when unique; otherwise source row IDs give deterministic order. This is not chronological draft order.',
      'orderVerified is the source pick_order_verified flag, not an inference from pick_order.',
      'Players come only from direct draft player_id joins; unknown slots remain null. No roster inference.',
      'Legacy Payna, Batman, The Joker and Mortos are not merged into successor heroes. Unmapped heroes remain usable with null slugs.',
      'Game blue/red team IDs are authoritative for draft sides. Inconsistent series team metadata is reported, not used to discard otherwise valid game drafts.',
      'Public counts are checked before and after keyset pagination; nested draft rows are reconciled against the full public game_picks count.',
    ],
    rawHashes,
  };
  const snapshot = normalizeHistory({ heroes, teams, matches, games }, local, source);
  const report = {
    ...coverageReport(snapshot, local), configBundle: configURL,
    sourceSeriesAnomalies: matches.filter(m => m.team_1_id === m.team_2_id).map(m => ({ id: m.id, reason: 'identical source teams' })),
    sourceGameSeriesTeamMismatches: games.filter(g => [g.blue_side_team_id, g.red_side_team_id].some(id => id && ![g.match.team_1_id, g.match.team_2_id].includes(id))).map(g => ({ id: g.id, match: g.match_id, reason: 'game side team differs from series team metadata' })),
    matchesWithoutGames: matches.filter(m => !games.some(g => g.match_id === m.id)).map(m => m.id),
    allSeriesDateRange: (() => {
      const dates = matches.map(m => m.match_date).sort((a, b) => Date.parse(a) - Date.parse(b));
      return { from: dates[0], to: dates.at(-1) };
    })(),
    retrieval: { pageSize: 100, pagination: 'id.asc / id=gt.lastUUID / terminal empty page', countsBefore: counts, countsAfter: after },
    rawIdentities: {
      games: hash(games.map(g => g.id)), matches: hash(matches.map(m => m.id)),
      drafts: hash(games.flatMap(g => g.game_picks.map(p => p.id)).sort()),
    },
    rawGameDateRange: (() => {
      const dates = games.map(g => g.match.match_date).sort((a, b) => Date.parse(a) - Date.parse(b));
      return { from: dates[0], to: dates.at(-1) };
    })(),
  };
  report.snapshotSha256 = hash(JSON.stringify(snapshot) + '\n');
  progress(`Reconciled: ${JSON.stringify(snapshot.source.counts)}`);
  return { snapshot, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert(args.includes('--patch'), 'Usage: bun scripts/crawl-pro-history.mjs --patch [--cache DIR]');
  const ci = args.indexOf('--cache');
  assert(ci < 0 || (args[ci + 1] && !args[ci + 1].startsWith('--')), '--cache requires a directory');
  assert(args.every((arg, i) => arg === '--patch' || arg === '--cache' || (ci >= 0 && i === ci + 1)), 'Unknown CLI argument');
  const { snapshot, report } = await crawl({ cache: ci < 0 ? undefined : resolve(args[ci + 1]) });
  const existing = new Set();
  for (const path of ['public/data/pro-history.json', '.omo/evidence/multi-counter/crawl-report.json']) {
    try { await readFile(new URL('../' + path, import.meta.url)); existing.add(path); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  process.stdout.write(snapshotPatch(snapshot, report, existing));
}
