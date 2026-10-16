async function load(name) {
  const response = await fetch(`./data/${name}.json`);
  if (!response.ok) throw new Error(`Could not load ${name}: HTTP ${response.status}`);
  return response.json();
}

export const [heroes, items, runes, spells, meta, loreTranslation] = await Promise.all(
  ['heroes', 'items', 'runes', 'spells', 'meta', 'lore-vi'].map(load),
);
export const loreVi = loreTranslation.heroes;

export const roles = {
  'Sát thủ': 'Assassin',
  'Pháp sư': 'Mage',
  'Trợ thủ': 'Support',
  'Đấu sĩ': 'Warrior',
  'Đỡ đòn': 'Tank',
  'Xạ thủ': 'Marksman',
};

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function filterRecords(records, query, className = 'All') {
  const search = normalize(query);
  const selected = normalize(className);
  return records.filter((record) => {
    const classes = record.classes ?? [];
    const matchesClass = selected === 'all' || classes.some(
      (name) => normalize(name) === selected || normalize(roles[name]) === selected,
    );
    const searchable = [record.name, record.title, ...classes, ...classes.map((name) => roles[name])];
    return matchesClass && searchable.some((value) => normalize(value).includes(search));
  });
}

export function getArtwork(hero) {
  return hero.skins?.[0]?.splash || hero.skins?.[0]?.thumb ||
    hero.thumb || hero.image || hero.icon || hero.portrait || '';
}
