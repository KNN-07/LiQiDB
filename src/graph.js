export function createGraphIndex(graph) {
  return new Map(graph.pairs.map(pair => [
    `${graph.slugs[pair[0]]}:${graph.slugs[pair[1]]}`, pair,
  ]));
}

export function graphPair(data, counter, target) {
  const graph = data.matchupGraph;
  const row = data.graphIndex.get(`${counter}:${target}`);
  if (!row) return null;
  const reverse = data.graphIndex.get(`${target}:${counter}`);
  const reviewed = row[2] === -1 ? null : data.counterGuide.pairs[row[2]];
  const support = row[3].map(index => graph.interactions[index]);
  const opposition = reverse[3].map(index => graph.interactions[index]);
  const score = reviewed?.analysis.score ?? (support.length
    ? Math.max(...support.map(edge => data.mechanicsRules.rules.find(rule => rule.id === edge.rule).score))
    : null);
  return {
    counter, target, reviewed, support, opposition, score,
    status: reviewed ? 'reviewed' : support.length ? 'inferred' : 'unknown',
    confidence: reviewed?.analysis.confidence ?? (support.length ? 'low' : 'unrated'),
    sourceStates: [graph.sourceStates[row[0]], graph.sourceStates[row[1]]],
  };
}

export function graphHeroPairs(data, slug, direction) {
  return data.matchupGraph.slugs.filter(opponent => opponent !== slug).map(opponent =>
    graphPair(data, direction === 'incoming' ? opponent : slug, direction === 'incoming' ? slug : opponent),
  );
}
