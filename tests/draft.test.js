import { expect, test } from 'bun:test';
import { evaluateDraft } from '../src/draft.js';
import { createGraphIndex, graphPair } from '../src/graph.js';
import { createHistoryIndex } from '../src/history.js';

const fixture = (directions = []) => {
  const heroes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
    'flowborn', 'flowborn-2'].map(slug => ({
    slug, name: slug.startsWith('flowborn') ? 'Flowborn' : slug.toUpperCase(),
  }));
  const matchupGraph = {
    slugs: heroes.map(hero => hero.slug),
    sourceStates: heroes.map(() => 'available'),
    pairs: [], interactions: [],
  };
  for (let i = 0; i < heroes.length; i++) for (let j = 0; j < heroes.length; j++) {
    if (i !== j) matchupGraph.pairs.push([i, j, -1, []]);
  }
  const data = {
    heroes, matchupGraph, graphIndex: createGraphIndex(matchupGraph),
    counterGuide: { pairs: [] }, mechanicsRules: { rules: [] },
  };
  for (const [counter, target, status, score] of directions) {
    const row = data.graphIndex.get(`${counter}:${target}`);
    if (status === 'reviewed') {
      row[2] = data.counterGuide.pairs.length;
      data.counterGuide.pairs.push({ counter, target, analysis: { score, confidence: 'high' } });
    } else {
      const rule = `rule-${data.mechanicsRules.rules.length}`;
      data.mechanicsRules.rules.push({ id: rule, score });
      row[3].push(matchupGraph.interactions.length);
      matchupGraph.interactions.push({ rule });
    }
  }
  return data;
};
const draft = (allies = [], enemies = [], bans = []) => ({ allies, enemies, bans });

test('subtracts weighted reverse evidence and preserves graph pair details', () => {
  const data = fixture([['a', 'b', 'reviewed', 4], ['b', 'a', 'inferred', 2]]);
  const result = evaluateDraft(data, draft(['a'], ['b']));
  expect(result.team).toEqual({
    score: 60, coverage: 1, total: 1, reviewed: 1, inferred: 1, unknown: 0,
    pairs: [{
      ally: 'a', enemy: 'b', forward: graphPair(data, 'a', 'b'),
      reverse: graphPair(data, 'b', 'a'), net: 3,
    }],
  });
  expect(evaluateDraft(data, draft(['b'], ['a'])).team.score).toBe(-60);
  expect(evaluateDraft(data, draft(['a'], ['b']), { includeInferred: true })).toEqual(result);
  const excluded = evaluateDraft(data, draft(['a'], ['b']), { includeInferred: false }).team;
  expect(excluded).toMatchObject({ score: 80, reviewed: 1, inferred: 0, unknown: 0, coverage: 1 });
  expect(excluded.pairs[0].reverse).toEqual(result.team.pairs[0].reverse);
  expect(excluded.pairs[0].net).toBe(4);
});

test('excluded inference contributes neither evidence nor unknown directions', () => {
  const data = fixture([['a', 'b', 'inferred', 4], ['b', 'a', 'inferred', 2]]);
  expect(evaluateDraft(data, draft(['a'], ['b'])).team).toMatchObject({
    score: 20, coverage: 1, reviewed: 0, inferred: 2, unknown: 0,
  });
  const result = evaluateDraft(data, draft(['a'], ['b']), { includeInferred: false });
  expect(result.team).toMatchObject({
    score: null, coverage: 0, total: 1, reviewed: 0, inferred: 0, unknown: 0,
  });
  expect(result.team.pairs[0].net).toBe(0);
  expect(result.picks.every(pick => pick.score === null)).toBe(true);
  expect(result.bans.every(ban => ban.score === null)).toBe(true);
});

test('uses all cross-team pairs as denominator and counts directions separately', () => {
  const data = fixture([
    ['a', 'b', 'reviewed', 4], ['b', 'a', 'reviewed', 1],
    ['c', 'd', 'inferred', 2],
  ]);
  const team = evaluateDraft(data, draft(['a', 'c'], ['b', 'd'])).team;
  expect(team).toMatchObject({
    score: 20, coverage: 2, total: 4, reviewed: 2, inferred: 1, unknown: 5,
  });
  expect(team.pairs.map(({ ally, enemy, net }) => [ally, enemy, net])).toEqual([
    ['a', 'b', 3], ['a', 'd', 0], ['c', 'b', 0], ['c', 'd', 1],
  ]);
});

test('rounds the normalized score and counts a reviewed zero as evidence', () => {
  const data = fixture([['a', 'b', 'reviewed', 1], ['a', 'c', 'reviewed', 0]]);
  expect(evaluateDraft(data, draft(['a'], ['b', 'c', 'd'])).team.score).toBe(7);
  expect(evaluateDraft(data, draft(['a'], ['c'])).team).toMatchObject({
    score: 0, coverage: 1, reviewed: 1, inferred: 0, unknown: 1,
  });
  const allies = ['a', 'e'];
  const enemies = ['b', 'c', 'd', 'f'];
  expect(evaluateDraft(data, draft(allies, enemies)).team.score).toBe(3);
  expect(evaluateDraft(data, draft(enemies, allies)).team.score).toBe(-3);
});

test('unknown and absent pairs remain unrated rather than neutral evidence', () => {
  const data = fixture();
  const unknown = evaluateDraft(data, draft(['a'], ['b'])).team;
  expect(unknown).toMatchObject({
    score: null, coverage: 0, total: 1, reviewed: 0, inferred: 0, unknown: 2,
  });
  expect(unknown.pairs[0].forward.status).toBe('unknown');
  data.graphIndex.delete('a:b');
  data.graphIndex.delete('b:a');
  expect(evaluateDraft(data, draft(['a'], ['b'])).team).toEqual({
    ...unknown, pairs: [{ ally: 'a', enemy: 'b', forward: null, reverse: null, net: 0 }],
  });
});

test('empty teams have no score and recommendations have no invented priors', () => {
  const data = fixture();
  const result = evaluateDraft(data, draft());
  expect(result.team).toEqual({
    score: null, coverage: 0, total: 0, reviewed: 0, inferred: 0, unknown: 0, pairs: [],
  });
  expect(result.picks).toHaveLength(data.heroes.length);
  expect(result.bans).toEqual(result.picks);
  expect(result.picks.every(({ score, total, pairs }) => score === null && total === 0 && !pairs.length)).toBe(true);
  expect(evaluateDraft(data, draft(['a'])).team).toEqual(result.team);
  expect(evaluateDraft(data, draft([], ['a'])).team).toEqual(result.team);
});

test('pick rankings change with enemy composition and score only the candidate', () => {
  const data = fixture([
    ['a', 'b', 'reviewed', 5], ['c', 'b', 'reviewed', 1],
    ['c', 'd', 'reviewed', 5], ['a', 'd', 'reviewed', 1],
  ]);
  const againstB = evaluateDraft(data, draft(['e'], ['b'])).picks;
  const againstD = evaluateDraft(data, draft(['e'], ['d'])).picks;
  expect(againstB.slice(0, 2).map(pick => pick.slug)).toEqual(['a', 'c']);
  expect(againstD.slice(0, 2).map(pick => pick.slug)).toEqual(['c', 'a']);
  expect(againstB[0]).toMatchObject({ score: 100, total: 1, coverage: 1 });
  expect(againstB[0].pairs.map(pair => [pair.ally, pair.enemy])).toEqual([['a', 'b']]);
});

test('ban rankings measure the candidate threat against current allies', () => {
  const data = fixture([
    ['a', 'e', 'reviewed', 5], ['e', 'a', 'reviewed', 1],
    ['e', 'c', 'reviewed', 5], ['a', 'b', 'reviewed', 2],
  ]);
  const result = evaluateDraft(data, draft(['e'], ['b']));
  expect(result.bans[0]).toMatchObject({ slug: 'a', score: 80, total: 1, reviewed: 2 });
  expect(result.bans[0].pairs.map(pair => [pair.ally, pair.enemy, pair.net])).toEqual([['a', 'e', 4]]);
  expect(result.picks[0]).toMatchObject({ slug: 'a', score: 40 });
  for (const ranking of [result.picks, result.bans]) {
    expect(ranking.some(({ slug }) => ['e', 'b'].includes(slug))).toBe(false);
  }
  const banned = evaluateDraft(data, draft(['e'], ['b'], ['a']));
  expect(banned.picks.some(pick => pick.slug === 'a')).toBe(false);
  expect(banned.bans.some(ban => ban.slug === 'a')).toBe(false);
});

test('known negative scores rank before unknown then score coverage name and slug break ties', () => {
  const data = fixture([
    ['a', 'h', 'reviewed', 2], ['c', 'h', 'reviewed', 2],
    ['d', 'h', 'reviewed', 1], ['d', 'i', 'reviewed', 1],
    ['h', 'e', 'reviewed', 5],
  ]);
  data.heroes.find(hero => hero.slug === 'a').name = 'Zulu';
  data.heroes.find(hero => hero.slug === 'c').name = 'Alpha';
  const input = draft([], ['h', 'i']);
  const before = evaluateDraft(data, input);
  expect(before.picks.slice(0, 4).map(pick => pick.slug)).toEqual(['d', 'c', 'a', 'e']);
  expect(before.picks[3].score).toBe(-50);
  expect(before.picks[4].score).toBeNull();
  expect(before.picks.filter(pick => pick.slug.startsWith('flowborn')).map(pick => pick.slug))
    .toEqual(['flowborn', 'flowborn-2']);
  data.heroes.reverse();
  expect(evaluateDraft(data, input)).toEqual(before);
});

test('each full team stops only its corresponding recommendation list', () => {
  const data = fixture();
  const fullAllies = ['a', 'b', 'c', 'd', 'e'];
  const fullEnemies = ['f', 'g', 'h', 'i', 'j'];
  const alliesFull = evaluateDraft(data, draft(fullAllies, ['f']));
  expect(alliesFull.picks).toEqual([]);
  expect(alliesFull.bans).not.toBeEmpty();
  const enemiesFull = evaluateDraft(data, draft(['a'], fullEnemies));
  expect(enemiesFull.bans).toEqual([]);
  expect(enemiesFull.picks).not.toBeEmpty();
  const bothFull = evaluateDraft(data, draft(fullAllies, fullEnemies));
  expect(bothFull.picks).toEqual([]);
  expect(bothFull.bans).toEqual([]);
  expect(bothFull.team).toMatchObject({ total: 25, coverage: 0, unknown: 50, score: null });
  expect(bothFull.team.pairs).toHaveLength(25);
});

test('Flowborn forms are mutually exclusive in every draft position', () => {
  const data = fixture();
  for (const input of [
    draft(['flowborn']), draft([], ['flowborn']), draft([], [], ['flowborn']),
    draft(['flowborn-2']), draft([], ['flowborn-2']), draft([], [], ['flowborn-2']),
  ]) {
    const result = evaluateDraft(data, input);
    for (const ranking of [result.picks, result.bans]) {
      expect(ranking.some(pick => pick.slug.startsWith('flowborn'))).toBe(false);
    }
  }
  for (const input of [
    draft(['flowborn', 'flowborn-2']), draft([], ['flowborn', 'flowborn-2']),
    draft([], [], ['flowborn', 'flowborn-2']), draft(['flowborn'], ['flowborn-2']),
    draft(['flowborn'], [], ['flowborn-2']), draft([], ['flowborn'], ['flowborn-2']),
  ]) expect(() => evaluateDraft(data, input)).toThrow(RangeError);
});

test('rejects unknown slugs duplicates and oversized teams without pinning error prose', () => {
  const data = fixture();
  for (const input of [
    draft(['missing']), draft([], ['missing']), draft([], [], ['missing']),
    draft(['a', 'a']), draft([], ['a', 'a']), draft([], [], ['a', 'a']),
    draft(['a'], ['a']), draft(['a'], [], ['a']), draft([], ['a'], ['a']),
    draft(['a', 'b', 'c', 'd', 'e', 'f']), draft([], ['a', 'b', 'c', 'd', 'e', 'f']),
  ]) expect(() => evaluateDraft(data, input)).toThrow(RangeError);
});

test('rejects malformed draft arrays slugs and options', () => {
  const data = fixture();
  for (const input of [
    undefined, null, [], {}, { allies: [], enemies: [] },
    { ...draft(), allies: 'a' }, { ...draft(), enemies: null }, { ...draft(), bans: {} },
    draft([1]), draft([], [null]), draft([], [], [{}]),
  ]) expect(() => evaluateDraft(data, input)).toThrow(TypeError);
  for (const options of [
    null, [], true, 'false', { includeInferred: 'false' },
    { includeInferred: 0 }, { includeInferred: null }, { extra: true },
  ]) expect(() => evaluateDraft(data, draft(), options)).toThrow(TypeError);
});

test('evaluation leaves caller data draft and options unchanged', () => {
  const data = fixture([['a', 'b', 'reviewed', 5], ['c', 'b', 'inferred', 3]]);
  const input = draft(['a'], ['b'], ['d']);
  const options = { includeInferred: false };
  const original = structuredClone({ data, input, options });
  evaluateDraft(data, input, options);
  expect({ data, input, options }).toEqual(original);
});

test('one candidate answering two enemies outranks a stronger single-target answer', () => {
  const data=fixture([
    ['a','h','reviewed',5],
    ['c','h','reviewed',2],['c','i','reviewed',2],
  ]);
  const result=evaluateDraft(data,draft([],['h','i']));
  expect(result.picks[0].slug).toBe('c');
  expect(result.picks[0].countered).toEqual(['h','i']);
  expect(result.picks.find(row=>row.slug==='a').countered).toEqual(['h']);
  expect(evaluateDraft(data,draft([],['h','i'],['c'])).picks[0].slug).toBe('a');
});

test('opposing mechanics and excluded inference cannot inflate multi-target coverage', () => {
  const data=fixture([
    ['a','h','reviewed',2],['a','i','inferred',2],['i','a','reviewed',3],
    ['c','h','reviewed',2],['c','i','inferred',2],
  ]);
  let result=evaluateDraft(data,draft([],['h','i']));
  expect(result.picks[0].slug).toBe('c');
  expect(result.picks.find(row=>row.slug==='a')).toMatchObject({countered:['h'],threats:['i']});
  result=evaluateDraft(data,draft([],['h','i']),{includeInferred:false});
  expect(result.picks.find(row=>row.slug==='c').countered).toEqual(['h']);
  expect(result.picks.find(row=>row.slug==='d').countered).toEqual([]);
});

test('actual joint history breaks mechanics ties but separate opponents and small samples do not', () => {
  const data=fixture([
    ['a','h','reviewed',2],['a','i','reviewed',2],
    ['c','h','reviewed',2],['c','i','reviewed',2],
  ]);
  const snapshot={
    heroes:data.heroes.map(hero=>({...hero,id:hero.slug})),
    players:[],teams:[{name:'Blue'},{name:'Red'}],
    matches:[{id:'m',date:'2025-01-01',tournament:'Recorded event'}],games:[],
  };
  for(const candidate of [0,2])for(let i=0;i<10;i++)snapshot.games.push({
    id:`${candidate}-${i}`,match:0,number:i+1,blueTeam:0,redTeam:1,
    blue:[candidate,3,4,5,6],red:[7,8,9,10,1],
    bluePlayers:Array(5).fill(null),redPlayers:Array(5).fill(null),
    winner:i<(candidate===2?8:2)?'blue':'red',
  });
  data.proHistoryIndex=createHistoryIndex(snapshot);
  expect(evaluateDraft(data,draft([],['h','i'])).picks[0].slug).toBe('c');
  expect(evaluateDraft(data,draft([],['h'])).picks[0].slug).toBe('a');
  expect(evaluateDraft(data,draft([],['h','i']),{historyYear:2026}).picks[0].slug).toBe('a');
  expect(evaluateDraft(data,draft([],['h','i']),{historyYear:0}).picks[0].joint)
    .toMatchObject({targets:['h','i'],games:10,wins:8,eligible:true});
  snapshot.games=snapshot.games.filter(game=>game.number<=2);
  data.proHistoryIndex=createHistoryIndex(snapshot);
  expect(evaluateDraft(data,draft([],['h','i'])).picks[0].slug).toBe('a');
});
