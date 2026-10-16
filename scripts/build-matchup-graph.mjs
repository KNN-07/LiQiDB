import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildGraph } from './mechanics-engine.mjs';

export async function generateGraph() {
  const load = async name => JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'));
  const [knowledge, rules, heroes, wiki, guide, season] = await Promise.all(
    ['hero-mechanics', 'mechanics-rules', 'heroes', 'hero-wiki', 'counters', 'season-meta'].map(load),
  );
  return buildGraph(knowledge, rules, heroes, wiki, guide, season);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateGraph();
  const path = 'public/data/matchup-graph.json';
  const text = `${JSON.stringify(result)}\n`;
  if (process.argv.includes('--check')) {
    if (await readFile(new URL(`../${path}`, import.meta.url), 'utf8') !== text) {
      throw new Error('Matchup graph is stale. Review source changes and regenerate with data:graph.');
    }
    console.log(`Mechanics graph checked: ${result.summary.pairs} directed pairs.`);
  } else if (process.argv.includes('--patch')) {
    console.log(`*** Begin Patch\n*** Delete File: ${path}\n*** Add File: ${path}\n+${text.trimEnd()}\n*** End Patch`);
  } else {
    throw new Error('Use --check or --patch.');
  }
}
