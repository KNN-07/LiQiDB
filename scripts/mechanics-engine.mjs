export function abilityRows(record) {
  const abilities = [];
  // The pinned wiki places current skills first, before Payna/Batman/Joker/old kits.
  for (const section of record.sections.filter(section => /^Kỹ năng(?:\s|$)/u.test(section.title)).slice(0,1)) {
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (block.kind !== 'table') continue;
      for (const [rowIndex, cells] of block.rows.entries()) {
        if (cells[0]?.header || cells.length < 3) continue;
        abilities.push({
          id: `${record.slug}:${blockIndex}:${rowIndex}`,
          label: cells[0].text,
          effects: cells[1].text,
          description: cells.slice(2).map(cell => cell.text).join('\n'),
          section: section.anchor,
          block: blockIndex,
          row: rowIndex,
        });
      }
    }
  }
  return abilities;
}

export function sourceSignature(record, balance) {
  return JSON.stringify([
    record.status, record.source?.revisionId ?? null,
    record.source?.renderedSha256 ?? null,
    balance.updates.filter(update => update.slugs.includes(record.slug)),
  ]);
}

export function buildGraph(knowledge, rules, heroes, wiki, guide, season) {
  const slugs = heroes.map(hero => hero.slug);
  const records = new Map(wiki.records.map(record => [record.slug, record]));
  const kits = new Map(knowledge.heroes.map(kit => [kit.slug, kit]));
  const states = slugs.map(slug => {
    const kit = kits.get(slug);
    const record = records.get(slug);
    if (kit.signature !== sourceSignature(record, season.balance)) return 'stale';
    if (record.status === 'missing') return 'missing';
    if (!abilityRows(record).length) return 'empty';
    return abilityRows(record).length < 4 ? 'partial' : 'available';
  });
  const facts = [];
  for (const [index, slug] of slugs.entries()) {
    if (['missing', 'empty', 'stale'].includes(states[index])) continue;
    const abilities = new Map(abilityRows(records.get(slug)).map(ability => [ability.id, ability]));
    const seen = new Set();
    for (const fact of kits.get(slug).facts) {
      const ability = abilities.get(fact.abilityId);
      const key = `${fact.abilityId}:${fact.tag}`;
      if (!ability || !ability.description.includes(fact.quote) || !fact.quote.trim()) {
        throw new Error(`Invalid ability evidence: ${slug} ${key}`);
      }
      if (fact.clarification) {
        const section = records.get(slug).sections.find(section => section.anchor === fact.clarification.section);
        const texts = section?.blocks.flatMap(block => block.kind === 'table'
          ? block.rows.flat().map(cell => cell.text) : [block.text]) || [];
        if (!fact.clarification.quote.trim() || !texts.some(text => text?.includes(fact.clarification.quote))) {
          throw new Error(`Invalid clarification evidence: ${slug} ${key}`);
        }
      }
      if (!knowledge.tags.includes(fact.tag)) throw new Error(`Unknown mechanics tag: ${fact.tag}`);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({ ...fact, hero: slug, id: key, ability: ability.label, section: ability.section });
    }
  }
  const factIndexes = new Map(slugs.map(slug => [slug, new Map()]));
  facts.forEach((fact, index) => {
    const tags = factIndexes.get(fact.hero);
    tags.set(fact.tag, [...(tags.get(fact.tag) || []), index]);
  });
  const interactions = [];
  const pairs = [];
  const staleReviewed = [];
  const reviewed = new Map(guide.pairs.map((pair, index) => [`${pair.counter}:${pair.target}`, index]));
  for (const [from, counter] of slugs.entries()) {
    const offers = factIndexes.get(counter);
    for (const [to, target] of slugs.entries()) {
      if (from === to) continue;
      const actions = factIndexes.get(target);
      const support = [];
      for (const rule of rules.rules) {
        let responseFacts = (offers.get(rule.response) || []).filter(index =>
          facts[index].recipient !== 'ally' &&
          (!facts[index].targetOnly || facts[index].targetOnly.includes(target)) &&
          (!rule.requiresResponseTag || facts.some(fact =>
            fact.hero === counter && fact.abilityId === facts[index].abilityId && fact.tag === rule.requiresResponseTag,
          )),
        );
        const targetFacts = [...new Set(rule.actions.flatMap(tag => actions.get(tag) || []))]
          .filter(index => responseFacts.some(response =>
            !(facts[response].removes || facts[response].prevents) ||
            (facts[response].removes || facts[response].prevents).includes(facts[index].tag),
          ));
        responseFacts = responseFacts.filter(index => targetFacts.some(action =>
          !(facts[index].removes || facts[index].prevents) ||
          (facts[index].removes || facts[index].prevents).includes(facts[action].tag),
        ));
        if (!responseFacts.length || !targetFacts.length) continue;
        // One causal mechanism per rule and pair, not one score per matching skill.
        support.push(interactions.length);
        interactions.push({ rule: rule.id, responseFacts, targetFacts });
      }
      let reviewedIndex = reviewed.get(`${counter}:${target}`) ?? -1;
      if (reviewedIndex !== -1) {
        const pair = guide.pairs[reviewedIndex];
        const changedSource = pair.analysis.evidence.some(evidence =>
          evidence.source === 'fandom' && records.get(evidence.hero)?.source?.revisionId !== evidence.revisionId,
        );
        if (changedSource || states[from] === 'stale' || states[to] === 'stale') {
          staleReviewed.push(reviewedIndex);
          reviewedIndex = -1;
        }
      }
      pairs.push([from, to, reviewedIndex, support]);
    }
  }
  return {
    version: 1, locale: 'vi', balanceDate: season.balance.date,
    ruleVersion: rules.version, slugs, sourceStates: states,
    pairFields: ['counterIndex', 'targetIndex', 'reviewedIndex', 'interactionIndexes'],
    facts, interactions, pairs, staleReviewed,
    summary: {
      pairs: pairs.length,
      reviewed: pairs.filter(pair => pair[2] !== -1).length,
      inferred: pairs.filter(pair => pair[2] === -1 && pair[3].length).length,
      unknown: pairs.filter(pair => pair[2] === -1 && !pair[3].length).length,
    },
  };
}
