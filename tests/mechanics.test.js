import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { buildGraph, sourceSignature } from '../scripts/mechanics-engine.mjs';
import { createGraphIndex, graphPair } from '../src/graph.js';

const load = async name => JSON.parse(await readFile(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'));
const rules = await load('mechanics-rules');
const fixture = () => {
  const heroes = ['a','b','c'].map(slug => ({slug}));
  const wiki = {records:heroes.map(({slug})=>({
    slug,status:'available',source:{revisionId:1,renderedSha256:slug},
    sections:[{title:'Kỹ năng',anchor:'skills',blocks:[{kind:'table',rows:[
      [{text:'Skill',header:true}],
      [{text:'One'},{text:'Effect'},{text:'explicit ability evidence'}],
      [{text:'Two'},{text:'Effect'},{text:'explicit second evidence'}],
    ]}]}],
  }))};
  const season = {balance:{date:'2026-10-15',updates:[]}};
  const knowledge = {tags:['anti-heal','heal-self','physical-immunity','physical-damage','damage-immunity','cc-immunity','cc-stun','cc-root','cc-suppress','cleanse','cast-while-controlled','untargetable','stealth','stealth-reveal'],heroes:wiki.records.map(record=>({
    slug:record.slug,signature:sourceSignature(record,season.balance),facts:[],
  }))};
  const add = (slug,tag,ability=1) => knowledge.heroes.find(hero=>hero.slug===slug).facts.push({
    abilityId:`${slug}:0:${ability}`,tag,quote:ability===1?'explicit ability evidence':'explicit second evidence',conditions:[],limitations:[],
  });
  const guide = {pairs:[]};
  const build = () => buildGraph(knowledge,rules,heroes,wiki,guide,season);
  return {heroes,wiki,season,knowledge,guide,add,build};
};
const row = (graph,a,b) => graph.pairs.find(pair=>graph.slugs[pair[0]]===a&&graph.slugs[pair[1]]===b);
const decode = (graph,guide,a,b) => graphPair({
  matchupGraph:graph,graphIndex:createGraphIndex(graph),mechanicsRules:rules,counterGuide:guide,
},a,b);

test('enumerates directed non-self pairs deterministically without transitive edges', () => {
  const f=fixture();
  f.add('a','anti-heal'); f.add('b','heal-self');
  f.add('b','physical-immunity'); f.add('c','physical-damage');
  const graph=f.build();
  expect(graph.pairs).toHaveLength(6);
  expect(graph.pairs.every(pair=>pair[0]!==pair[1])).toBe(true);
  expect(row(graph,'a','b')[3]).not.toBeEmpty();
  expect(row(graph,'b','c')[3]).not.toBeEmpty();
  expect(row(graph,'a','c')[3]).toBeEmpty();
  expect(f.build()).toEqual(graph);
  expect(decode(graph,f.guide,'a','c').status).toBe('unknown');
});

test('deduplicates facts and causal rules without inflating grades from edge counts', () => {
  const f=fixture();
  f.add('a','anti-heal');f.add('a','anti-heal');f.add('a','anti-heal',2);
  f.add('b','heal-self');f.add('b','heal-self',2);
  const graph=f.build();
  expect(row(graph,'a','b')[3]).toHaveLength(1);
  const edge=graph.interactions[row(graph,'a','b')[3][0]];
  expect(edge.responseFacts).toHaveLength(2);
  expect(edge.targetFacts).toHaveLength(2);
  expect(decode(graph,f.guide,'a','b').score).toBe(2);
});

test('never treats suppression as ordinary CC or untargetability as damage immunity', () => {
  const f=fixture();
  f.add('a','cleanse');f.add('a','cc-immunity');f.add('a','untargetable');
  f.add('b','cc-suppress');f.add('b','physical-damage');
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
  f.add('b','cc-root');
  expect(row(f.build(),'a','b')[3]).toHaveLength(2);
});

test('hard-control cleanse needs cast permission on the same ability', () => {
  const f=fixture();
  f.add('a','cleanse');f.add('b','cc-stun');
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
  f.add('a','cast-while-controlled',2);
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
  f.add('a','cast-while-controlled');
  expect(row(f.build(),'a','b')[3]).toHaveLength(1);
});

test('enforces recipient, named-opponent and exact removable-effect guards', () => {
  const f=fixture();
  f.add('a','cc-immunity');f.add('b','cc-root');f.add('c','cc-root');
  const response=f.knowledge.heroes[0].facts[0];
  response.recipient='ally';
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
  response.recipient='self';
  response.targetOnly=['b'];
  expect(row(f.build(),'a','b')[3]).toHaveLength(1);
  expect(row(f.build(),'a','c')[3]).toBeEmpty();
  f.knowledge.heroes[0].facts=[];
  f.add('a','cleanse');
  f.knowledge.heroes[0].facts[0].removes=['cc-slow'];
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
  f.knowledge.heroes[0].facts=[];
  f.add('a','cc-immunity');f.add('b','cc-stun');
  f.knowledge.heroes[0].facts[0].prevents=['cc-slow'];
  expect(row(f.build(),'a','b')[3]).toBeEmpty();
});

test('stealth requires explicit detection and opposing evidence stays separate', () => {
  const f=fixture();
  f.add('b','stealth');f.add('b','anti-heal');f.add('a','heal-self');
  let graph=f.build();
  expect(decode(graph,f.guide,'a','b').status).toBe('unknown');
  expect(decode(graph,f.guide,'a','b').opposition).toHaveLength(1);
  f.add('a','stealth-reveal');
  graph=f.build();
  expect(decode(graph,f.guide,'a','b').support).toHaveLength(1);
  expect(decode(graph,f.guide,'a','b').opposition).toHaveLength(1);
  expect(decode(graph,f.guide,'a','b').score).toBe(2);
});

test('changed revisions and per-hero patches invalidate only affected evidence', () => {
  const f=fixture();
  f.add('a','anti-heal');f.add('b','heal-self');f.add('c','heal-self');
  f.wiki.records[1].source.revisionId=2;
  let graph=f.build();
  expect(graph.sourceStates[1]).toBe('stale');
  expect(row(graph,'a','b')[3]).toBeEmpty();
  expect(row(graph,'a','c')[3]).not.toBeEmpty();
  f.season.balance.updates.push({slugs:['c'],summary:'changed kit'});
  graph=f.build();
  expect(row(graph,'a','c')[3]).toBeEmpty();
  expect(graph.sourceStates[0]).not.toBe('stale');
});

test('rejects invented ability evidence and preserves reviewed scores independently', () => {
  const f=fixture();
  f.add('a','anti-heal');f.add('b','heal-self');
  f.guide.pairs.push({counter:'a',target:'b',analysis:{score:3,confidence:'medium',evidence:[{hero:'a',source:'fandom',revisionId:1}]}});
  let graph=f.build();
  expect(decode(graph,f.guide,'a','b').status).toBe('reviewed');
  expect(decode(graph,f.guide,'a','b').score).toBe(3);
  f.wiki.records[0].source.revisionId=2;
  graph=f.build();
  expect(graph.staleReviewed).toEqual([0]);
  expect(decode(graph,f.guide,'a','b').status).toBe('unknown');
  f.wiki.records[0].source.revisionId=1;
  f.knowledge.heroes[0].facts[0].quote='invented';
  expect(f.build).toThrow('Invalid ability evidence');
  f.knowledge.heroes[0].facts[0].quote='explicit ability evidence';
  f.knowledge.heroes[0].facts[0].clarification={section:'skills',quote:'invented clarification'};
  expect(f.build).toThrow('Invalid clarification evidence');
});

test('published graph exactly reproduces all roster pairs and source facts', async () => {
  const [knowledge,heroes,wiki,guide,season,published] = await Promise.all(
    ['hero-mechanics','heroes','hero-wiki','counters','season-meta','matchup-graph'].map(load),
  );
  expect(knowledge.heroes.map(hero=>hero.slug).sort()).toEqual(heroes.map(hero=>hero.slug).sort());
  const actual=buildGraph(knowledge,rules,heroes,wiki,guide,season);
  expect(actual).toEqual(published);
  expect(actual.pairs).toHaveLength(heroes.length*(heroes.length-1));
  expect(new Set(actual.pairs.map(pair=>`${pair[0]}:${pair[1]}`)).size).toBe(actual.pairs.length);
  expect(actual.summary.reviewed).toBe(guide.pairs.length);
  expect(actual.summary.inferred).toBeGreaterThan(guide.pairs.length);
  expect(actual.staleReviewed).toBeEmpty();
  for (const pair of actual.pairs) for (const index of pair[3]) {
    const edge=actual.interactions[index];
    for(const fact of edge.responseFacts)expect(actual.facts[fact].hero).toBe(actual.slugs[pair[0]]);
    for(const fact of edge.targetFacts)expect(actual.facts[fact].hero).toBe(actual.slugs[pair[1]]);
  }
});
