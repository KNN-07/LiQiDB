import { graphPair } from './graph.js';
import { getHeroHistory } from './history.js';

// The roster exposes Flowborn's mage and marksman forms as separate records.
const identity = slug => slug === 'flowborn-2' ? 'flowborn' : slug;

export function evaluateDraft(data, draft, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => !['includeInferred','historyYear'].includes(key)) ||
      (options.includeInferred !== undefined && typeof options.includeInferred !== 'boolean') ||
      (options.historyYear !== undefined && (!Number.isInteger(options.historyYear) || options.historyYear < 0))) {
    throw new TypeError('Draft options require boolean includeInferred and nonnegative integer historyYear');
  }
  const { includeInferred = true } = options;
  const historyYear = options.historyYear ?? data.proHistoryIndex?.years[0] ?? 0;
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new TypeError('Draft must contain allies, enemies and bans arrays');
  }
  const roster = new Map(data.heroes.map(hero => [hero.slug, hero]));
  const used = new Set();
  for (const key of ['allies', 'enemies', 'bans']) {
    if (!Array.isArray(draft[key])) throw new TypeError(`Draft ${key} must be an array`);
    if (key !== 'bans' && draft[key].length > 5) {
      throw new RangeError(`Draft ${key} cannot contain more than five heroes`);
    }
    for (const slug of draft[key]) {
      if (typeof slug !== 'string') throw new TypeError(`Draft ${key} must contain hero slugs`);
      if (!roster.has(slug)) throw new RangeError(`Unknown hero slug: ${slug}`);
      const hero = identity(slug);
      if (used.has(hero)) throw new RangeError(`Duplicate hero or alternate form: ${slug}`);
      used.add(hero);
    }
  }

  const summarize = (allies, enemies) => {
    const summary = { score: null, coverage: 0, total: allies.length * enemies.length,
      reviewed: 0, inferred: 0, unknown: 0, pairs: [] };
    let sum = 0;
    for (const ally of allies) for (const enemy of enemies) {
      const forward = graphPair(data, ally, enemy);
      const reverse = graphPair(data, enemy, ally);
      let covered = false;
      const contribution = direction => {
        if (!direction || direction.status === 'unknown' || direction.score === null) {
          summary.unknown++;
          return 0;
        }
        if (direction.status === 'inferred' && !includeInferred) return 0;
        summary[direction.status]++;
        covered = true;
        return direction.score * (direction.status === 'reviewed' ? 1 : 0.5);
      };
      const net = contribution(forward) - contribution(reverse);
      if (covered) summary.coverage++;
      sum += net;
      summary.pairs.push({ ally, enemy, forward, reverse, net });
    }
    if (summary.coverage) summary.score = Math.sign(sum) * Math.round(100 * Math.abs(sum) / (5 * summary.total));
    return summary;
  };

  const available = data.heroes.filter(hero => !used.has(identity(hero.slug)));
  const rank = opponents => available.map(hero => {
    const summary = summarize([hero.slug], opponents);
    const countered = summary.pairs.filter(pair => pair.net > 0).map(pair => pair.enemy);
    const threats = summary.pairs.filter(pair => pair.net < 0).map(pair => pair.enemy);
    const history = getHeroHistory(data.proHistoryIndex, hero.slug, opponents, historyYear);
    const joint = history.joint.find(pair => pair.eligible) || null;
    return {slug:hero.slug, ...summary, countered, threats, history, joint};
  }).sort((a, b) =>
    Number(b.score !== null) - Number(a.score !== null) ||
    Number((b.score ?? 0) >= 0) - Number((a.score ?? 0) >= 0) ||
    b.countered.length - a.countered.length ||
    a.threats.length - b.threats.length ||
    (b.score ?? 0) - (a.score ?? 0) ||
    (b.joint?.adjustedRate ?? 50) - (a.joint?.adjustedRate ?? 50) ||
    b.coverage - a.coverage ||
    (roster.get(a.slug).name ?? a.slug).localeCompare(roster.get(b.slug).name ?? b.slug, 'vi') ||
    a.slug.localeCompare(b.slug, 'vi'),
  );

  return {
    team: summarize(draft.allies, draft.enemies),
    picks: draft.allies.length === 5 ? [] : rank(draft.enemies),
    bans: draft.enemies.length === 5 ? [] : rank(draft.allies),
  };
}
