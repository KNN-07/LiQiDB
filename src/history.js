export const MIN_JOINT_GAMES = 5;
export const HISTORY_PRIOR_GAMES = 10;

export function createHistoryIndex(snapshot) {
  const byHero = new Map();
  const years = new Set();
  snapshot.games.forEach((game, gameIndex) => {
    const year = Number(snapshot.matches[game.match].date?.slice(0, 4));
    if (year) years.add(year);
    for (const side of ['blue', 'red']) game[side].forEach((heroIndex, slot) => {
      const slug = snapshot.heroes[heroIndex].slug;
      if (!slug) return;
      if (!byHero.has(slug)) byHero.set(slug, []);
      byHero.get(slug).push({gameIndex, side, slot, year});
    });
  });
  return {snapshot, byHero, years: [...years].sort((a,b) => b-a)};
}

export function getHeroHistory(index, slug, opponents, year = 0) {
  const result = {games:0, wins:0, winRate:null, players:[], opponents:[], joint:[]};
  if (!index) return result;
  const {snapshot} = index;
  const selected = new Set(opponents);
  const pairs = new Map();
  const singles = new Map();
  const players = new Map();
  for (const entry of index.byHero.get(slug) || []) {
    if (year && entry.year !== year) continue;
    const game = snapshot.games[entry.gameIndex];
    const won = game.winner === entry.side;
    result.games++;
    result.wins += Number(won);
    const playerIndex = game[`${entry.side}Players`][entry.slot];
    if (playerIndex !== null) {
      const player = snapshot.players[playerIndex];
      if (!players.has(player.id)) players.set(player.id, {name:player.name, games:0, wins:0});
      const stats = players.get(player.id);
      stats.games++; stats.wins += Number(won);
    }
    const opposing = entry.side === 'blue' ? game.red : game.blue;
    const matched = opposing.map(hero => snapshot.heroes[hero].slug)
      .filter(enemy => enemy && selected.has(enemy)).sort();
    for (const enemy of matched) {
      if (!singles.has(enemy)) singles.set(enemy, {slug:enemy, games:0, wins:0});
      const stats = singles.get(enemy);
      stats.games++; stats.wins += Number(won);
    }
    // Both targets must be present on the opposing side of this exact game.
    for (let a=0; a<matched.length; a++) for (let b=a+1; b<matched.length; b++) {
      const targets = [matched[a], matched[b]];
      const key = targets.join(':');
      if (!pairs.has(key)) pairs.set(key, {targets, games:0, wins:0, examples:[]});
      const stats = pairs.get(key);
      stats.games++; stats.wins += Number(won);
      const match = snapshot.matches[game.match];
      stats.examples.push({
        id:game.id, matchId:match.id, number:game.number, date:match.date,
        tournament:match.tournament, won,
        player:playerIndex === null ? null : snapshot.players[playerIndex].name,
        team:snapshot.teams[game[`${entry.side}Team`]].name,
      });
    }
  }
  const rate = stats => ({...stats, winRate:stats.wins / stats.games * 100});
  result.winRate = result.games ? result.wins / result.games * 100 : null;
  result.players = [...players.values()].map(rate).sort((a,b)=>b.games-a.games || a.name.localeCompare(b.name)).slice(0,3);
  result.opponents = [...singles.values()].map(rate).sort((a,b)=>a.slug.localeCompare(b.slug));
  result.joint = [...pairs.values()].map(stats => ({
    ...rate(stats),
    adjustedRate:(stats.wins + HISTORY_PRIOR_GAMES / 2) / (stats.games + HISTORY_PRIOR_GAMES) * 100,
    eligible:stats.games >= MIN_JOINT_GAMES,
    examples:stats.examples.sort((a,b)=>String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id)).slice(0,3),
  })).sort((a,b)=>Number(b.eligible)-Number(a.eligible) || b.adjustedRate-a.adjustedRate || b.games-a.games || a.targets.join(':').localeCompare(b.targets.join(':')));
  return result;
}
