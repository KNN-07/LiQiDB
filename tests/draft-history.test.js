import { expect, test } from 'bun:test';
import { createHistoryIndex, getHeroHistory } from '../src/history.js';

const fixture = () => ({
  heroes:['a','b','c','d','e','f','g','h','i','j','k'].map(slug=>({id:slug,name:slug,slug})),
  players:[{id:'p',name:'Recorded pro'}],
  teams:[{id:'blue',name:'Blue team'},{id:'red',name:'Red team'}],
  matches:[
    {id:'old',date:'2020-01-01',tournament:'Old event'},
    {id:'new',date:'2026-10-01',tournament:'New event'},
  ],
  games:[],
});
const game = (id, blue, red, winner = 'blue', match = 1) => ({
  id,match,number:1,blueTeam:0,redTeam:1,blue,red,winner,
  bluePlayers:[0,null,null,null,null],redPlayers:Array(5).fill(null),
  blueBans:[],redBans:[],orderVerified:false,
});

test('joint opponent evidence requires both enemies in the same opposing lineup', () => {
  const snapshot=fixture();
  snapshot.games.push(game('one',[0,3,4,5,6],[1,7,8,9,10]));
  snapshot.games.push(game('two',[0,3,4,5,6],[2,7,8,9,10]));
  let index=createHistoryIndex(snapshot);
  expect(getHeroHistory(index,'a',['b','c']).joint).toEqual([]);
  snapshot.games.push(game('both',[0,3,4,5,6],[1,2,7,8,9]));
  index=createHistoryIndex(snapshot);
  const result=getHeroHistory(index,'a',['b','c']);
  expect(result.games).toBe(3);
  expect(result.joint).toHaveLength(1);
  expect(result.joint[0]).toMatchObject({targets:['b','c'],games:1,wins:1,eligible:false});
  expect(result.joint[0].examples[0]).toMatchObject({id:'both',matchId:'new',player:'Recorded pro',won:true});
});

test('same-team picks are not counted as opponents and red-side wins retain direction', () => {
  const snapshot=fixture();
  snapshot.games.push(game('red',[3,4,5,6,7],[0,1,2,8,9],'red'));
  const result=getHeroHistory(createHistoryIndex(snapshot),'a',['b','c','d','e']);
  expect(result.wins).toBe(1);
  expect(result.joint[0]).toMatchObject({targets:['d','e'],games:1,wins:1});
  expect(result.joint[0].examples[0].player).toBeNull();
  expect(result.opponents.map(row=>row.slug)).toEqual(['d','e']);
});

test('year scopes separate old games and small samples do not qualify', () => {
  const snapshot=fixture();
  for(let i=0;i<5;i++)snapshot.games.push(game(`old-${i}`,[0,3,4,5,6],[1,2,7,8,9],'blue',0));
  snapshot.games.push(game('new',[0,3,4,5,6],[1,2,7,8,9],'red',1));
  const index=createHistoryIndex(snapshot);
  expect(index.years).toEqual([2026,2020]);
  const old=getHeroHistory(index,'a',['b','c'],2020);
  expect(old.joint[0]).toMatchObject({games:5,wins:5,eligible:true});
  expect(old.joint[0].adjustedRate).toBeCloseTo(66.6666667);
  const recent=getHeroHistory(index,'a',['b','c'],2026);
  expect(recent.joint[0]).toMatchObject({games:1,wins:0,eligible:false});
  expect(getHeroHistory(index,'a',['b','c'],0).games).toBe(6);
  expect(getHeroHistory(index,'k',['b','c'],2026).winRate).toBeNull();
});

test('unmapped source heroes remain in games without being fabricated as local heroes', () => {
  const snapshot=fixture();
  snapshot.heroes[1].slug=null;
  snapshot.games.push(game('unmapped',[0,3,4,5,6],[1,2,7,8,9]));
  const index=createHistoryIndex(snapshot);
  expect(index.byHero.has(null)).toBe(false);
  expect(getHeroHistory(index,'a',['b','c']).opponents.map(row=>row.slug)).toEqual(['c']);
  expect(getHeroHistory(index,'a',['b','c']).joint).toEqual([]);
});
