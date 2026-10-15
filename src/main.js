import './style.css';

const main = document.querySelector('main');
const dialog = document.querySelector('#detail');
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames = {'Sát thủ':'Assassin','Đấu sĩ':'Warrior','Pháp sư':'Mage','Xạ thủ':'Marksman','Đỡ đòn':'Tank','Trợ thủ':'Support'};
const role = hero => (hero.classes || []).map(c => roleNames[c] || c).join(' / ');
const portrait = hero => hero.portrait || hero.skins?.[0]?.thumb;
const art = hero => hero.skins?.[0]?.splash || portrait(hero);
const image = (url, alt, cls = '', eager = false) => url ? `<img src="${escape(url)}" alt="${escape(alt)}" class="${cls}" width="400" height="500" loading="${eager ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">` : `<span class="image-fallback">${escape(alt.slice(0, 1))}</span>`;
const normalize = value => data.normalize(value);
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let data, query = '', selectedRole = 'All', sort = 'name';
let rankings = readStored('liqidb-tiers', {});
const tiers = ['S', 'A', 'B', 'C', 'D'];
const theme = document.querySelector('#theme');
theme.value = localStorage.getItem('liqidb-theme') || 'system';
function setTheme() {
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem('liqidb-theme', theme.value);
}
theme.addEventListener('change', setTheme);
setTheme();
const view = () => ['heroes','tier-list','items','runes','spells'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'heroes';

function header(title, subtitle, eyebrow = 'THE ATHANOR FIELD GUIDE') {
  return `<section class="page-intro"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="intro-copy">${subtitle}</p></div><span class="source-badge"><span class="status-dot"></span> Community-powered open data</span></section>`;
}
function toolbar(type, count) {
  return `<div class="toolbar"><label class="search"><span>Search ${type}</span><div class="search-field"><span aria-hidden="true">&#9906;</span><input id="search" type="search" placeholder="Search by name${type === 'heroes' ? ' or title' : ''}..." value="${escape(query)}" autocomplete="off"><kbd>/</kbd></div></label><label class="sort"><span>Sort by</span><select id="sort"><option value="name"${sort === 'name' ? ' selected' : ''}>Name: A to Z</option><option value="reverse"${sort === 'reverse' ? ' selected' : ''}>Name: Z to A</option></select></label><span class="result-count" aria-live="polite">${count} ${type}</span></div>`;
}
function filtered(records) {
  return data.filterRecords(records, query, selectedRole).sort((a,b) => sort === 'reverse' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
}
function heroCard(hero) {
  return `<button class="hero-card" data-hero="${escape(hero.slug)}" aria-label="Explore ${escape(hero.name)}">${image(portrait(hero), hero.name)}<span class="card-scrim"></span><span class="hero-card-copy"><span class="hero-card-name">${escape(hero.name)}<span aria-hidden="true">&nearr;</span></span><span class="hero-card-role">${escape(role(hero))}</span></span></button>`;
}
function empty() {
  return `<section class="empty"><span class="empty-symbol" aria-hidden="true">&#9906;</span><h2>No matches in the field guide</h2><p>Try another name, or clear your filters to explore everything.</p><button class="button" data-clear>Clear filters</button></section>`;
}
function renderHeroes() {
  const list = filtered(data.heroes);
  const feature = data.heroes.find(h => h.slug === 'airi') || data.heroes[0];
  main.innerHTML = `<div class="content">${header('Know your next main.', 'Every hero. Every ability. Your edge in Athanor.')}
  <section class="feature"><img class="feature-art" src="${escape(art(feature))}" alt="${escape(feature.name)} official artwork" width="1200" height="500" fetchpriority="high"><div class="feature-scrim"></div><div class="feature-copy"><p class="eyebrow">EXPLORE THE ROSTER</p><h2>Legends aren&rsquo;t born.<br>They&rsquo;re mastered.</h2><p>Find your playstyle. Learn the abilities.<br>Make your next match count.</p><button class="button" data-hero="${feature.slug}">Meet ${escape(feature.name)} <span>&nearr;</span></button></div><span class="feature-caption">${escape(feature.name)}<small>${escape(feature.title)}</small></span></section>
  <section class="roster"><div class="section-heading"><h2>Hero database <span>${data.heroes.length}</span></h2><a href="#tier-list">Build your tier list &rarr;</a></div>
  <div class="role-filters" role="group" aria-label="Filter heroes by class">${['All','Warrior','Assassin','Mage','Marksman','Tank','Support'].map((r,i)=>`<button data-role="${r}" aria-pressed="${selectedRole === r}" class="${selectedRole === r ? 'selected' : ''}"><span class="role-glyph" aria-hidden="true">${['&#10022;','&#9876;','&#9672;','&#10023;','&#10164;','&#11041;','&#10010;'][i]}</span>${r === 'All' ? 'All heroes' : r}</button>`).join('')}</div>
  ${toolbar('heroes', list.length)}<div id="results">${list.length ? `<div class="hero-grid">${list.map(heroCard).join('')}</div>` : empty()}</div></section>
  <aside class="guide-note"><span class="note-mark">i</span><div><strong>Your knowledge, built on open data.</strong><p>Original Vietnamese skill text and stats, preserved from the source. Reference data may differ from the live game.</p></div><a href="https://github.com/MLuc24/lien-quan-data" target="_blank" rel="noreferrer">Explore the source &nearr;</a></aside></div>`;
}
const collectionNames = {items:['Equipment','Build for the battle ahead.','Discover equipment, stats, prices and unique passives.'],runes:['Arcana','Small choices. Lasting impact.','Explore arcana effects and tiers to shape your playstyle.'],spells:['Spells','One spell can change everything.','Know your summoner spells before you enter the arena.']};
function recordCard(record, index) {
  const text = record.description || record.effect || record.effects || record.stats || '';
  const preview = typeof text === 'string' ? text : Array.isArray(text) ? text.map(t => typeof t === 'string' ? t : `${t.label || t.name || ''} ${t.value || ''}`).join(' / ') : '';
  return `<button class="record-card" data-record="${index}"><div class="record-top">${image(record.icon || record.image || record.portrait, record.name)}<div><h2>${escape(record.name)}</h2><span>${escape(record.gold ? `${record.gold.toLocaleString()} gold` : record.tier ? `Tier ${record.tier}` : record.cooldown ? `${record.cooldown} cooldown` : 'Source reference')}</span></div><span aria-hidden="true">&nearr;</span></div><p>${escape(preview.slice(0,180)) || 'View effects and source details.'}</p></button>`;
}
function renderCollection(type) {
  const [title, headline, subtitle] = collectionNames[type];
  const list = filtered(data[type]);
  main.innerHTML = `<div class="content">${header(headline, subtitle, `${title.toUpperCase()} DATABASE`)}${toolbar(title.toLowerCase(),list.length)}<div id="results">${list.length ? `<div class="record-grid">${list.map(r => recordCard(r, data[type].indexOf(r))).join('')}</div>` : empty()}</div><p class="data-caption">Vietnamese descriptions are preserved from the source. Snapshot: ${new Date(data.meta.snapshotDate).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}. Select a record for complete details.</p></div>`;
}
function tierHero(hero) {
  const rank = tiers.includes(rankings[hero.slug]) ? rankings[hero.slug] : '';
  return `<div class="tier-hero">${image(portrait(hero),hero.name)}<span>${escape(hero.name)}</span><label><span class="sr-only">Tier for ${escape(hero.name)}</span><select data-rank="${escape(hero.slug)}" aria-label="Tier for ${escape(hero.name)}"><option value=""${!rank ? ' selected' : ''}>Unranked</option>${tiers.map(t=>`<option${rank===t?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
}
function renderTiers() {
  const pool = filtered(data.heroes).filter(h => !tiers.includes(rankings[h.slug]));
  const rankedCount = data.heroes.filter(h => tiers.includes(rankings[h.slug])).length;
  main.innerHTML = `<div class="content">${header('Your roster. Your rules.', 'Create a tier list that reflects how you play.', 'PERSONAL TIER LIST BUILDER')}
  <div class="tier-notice"><span class="note-mark">i</span><p><strong>Personal rankings, not a live meta ranking.</strong> The dataset does not include competitive tiers or win rates. Your choices save automatically in this browser.</p></div>
  <div class="section-heading"><h2>My tier list <span>${rankedCount} ranked</span></h2><div class="cluster"><button class="button secondary" id="export">Export JSON &darr;</button><button class="button secondary" id="reset-tiers">Reset list</button></div></div>
  <section class="tier-board" aria-label="Personal tier list">${tiers.map(t => `<div class="tier-row"><h2>${t}<small>TIER</small></h2><div class="tier-members">${data.heroes.filter(h => rankings[h.slug] === t).map(tierHero).join('') || `<p class="tier-empty">Assign a hero to ${t} using its tier selector.</p>`}</div></div>`).join('')}</section>
  <div class="section-heading pool-heading"><h2>Unranked heroes <span>${data.heroes.length-rankedCount}</span></h2></div>${toolbar('heroes',pool.length)}<section class="tier-pool">${pool.map(tierHero).join('') || '<p class="tier-empty">No unranked heroes match your search.</p>'}</section><p id="save-status" class="data-caption" role="status">Saved locally. Use Export JSON to keep a copy.</p></div>`;
}
function render() {
  const current = view();
  for (const link of document.querySelectorAll('[data-view]')) {
    link.classList.toggle('active', link.dataset.view === current);
    if (link.dataset.view === current) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  document.title = `${current === 'heroes' ? 'Heroes' : current === 'tier-list' ? 'Personal Tier List' : collectionNames[current][0]} - LiQiDB`;
  if (current === 'heroes') renderHeroes(); else if (current === 'tier-list') renderTiers(); else renderCollection(current);
}
function detailSources(sources = {}) {
  return `<section class="detail-section sources"><h2>Sources &amp; attribution</h2><p>Game data and artwork: Garena / TiMi Studios. Wiki-derived lore, trivia and balance history: Arena of Valor Fandom contributors, <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.</p><div class="cluster">${Object.entries(sources).filter(([,url])=> typeof url === 'string' && /^https?:\/\//.test(url)).map(([label,url])=>`<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape(label)} &nearr;</a>`).join('')}<a href="https://github.com/MLuc24/lien-quan-data" target="_blank" rel="noreferrer">MLuc24 dataset &nearr;</a></div></section>`;
}
function openHero(slug) {
  const hero = data.heroes.find(h=>h.slug===slug);
  if (!hero) return;
  dialog.innerHTML = `<button class="close-dialog" aria-label="Close hero details">&times;</button><div class="detail-art">${image(art(hero),hero.name,'',true)}<div class="detail-title"><p class="eyebrow">${escape(role(hero))} &nbsp; / &nbsp; ${escape(hero.lane || 'Athanor')}</p><h1 id="detail-title">${escape(hero.name)}</h1><p>${escape(hero.title)}</p></div></div><div class="detail-body"><section class="detail-section"><h2>Base stats</h2><div class="stats-grid">${(hero.stats || []).map(s=>`<div><span>${escape(s.label)}</span><strong>${escape(s.value)}</strong></div>`).join('') || '<p>Base stats are not provided by this source.</p>'}</div></section><section class="detail-section"><h2>Abilities <small>Original Vietnamese text</small></h2><div class="skills">${(hero.skills || []).map(s=>`<article class="skill">${image(s.icon,s.name)}<div><span class="eyebrow">${escape(s.slotLabel)}</span><h3>${escape(s.name)}</h3><p lang="vi">${escape(s.description)}</p></div></article>`).join('')}</div></section>
  <section class="detail-section"><h2>Suggested builds</h2>${(hero.build?.itemSets || []).map((set,i)=>`<h3>Build ${i+1}</h3><div class="build-items">${set.map(name=>{const item=data.items.find(it=>normalize(it.name)===normalize(name));return `<div>${item?image(item.icon||item.image,name):''}<span>${escape(name)}</span></div>`}).join('')}</div>`).join('') || '<p>No suggested build is available in the source.</p>'}${(hero.build?.notes||[]).map(n=>`<p lang="vi">${escape(n)}</p>`).join('')}</section>${hero.lore?.length?`<section class="detail-section"><h2>Hero story</h2>${(Array.isArray(hero.lore)?hero.lore:[hero.lore]).map(paragraph=>`<p class="lore" lang="vi">${escape(paragraph)}</p>`).join('')}</section>`:''}${detailSources(hero.sources)}</div>`;
  dialog.showModal();
  dialog.scrollTop = 0;
}
function humanize(key) {
  return key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,s=>s.toUpperCase());
}
function renderValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `<ul>${value.map(v=>`<li>${renderValue(v)}</li>`).join('')}</ul>`;
  if (value && typeof value === 'object') return `<dl>${Object.entries(value).map(([k,v])=>`<dt>${escape(humanize(k))}</dt><dd>${renderValue(v)}</dd>`).join('')}</dl>`;
  return escape(value);
}
function openRecord(index) {
  const r = data[view()][index];
  dialog.innerHTML = `<button class="close-dialog" aria-label="Close details">&times;</button><div class="detail-body record-detail"><p class="eyebrow">${collectionNames[view()][0]} REFERENCE</p><h1 id="detail-title">${escape(r.name)}</h1>${image(r.icon||r.image,r.name,'record-icon',true)}${Object.entries(r).filter(([k])=> !['name','slug','icon','image','sources','searchKey','portrait'].includes(k)).map(([k,v])=>`<section class="detail-section"><h2>${escape(humanize(k))}</h2><div lang="vi">${renderValue(v)}</div></section>`).join('')}${detailSources(r.sources)}</div>`;
  dialog.showModal();
  dialog.scrollTop = 0;
}
main.addEventListener('click',event=>{
  const hero = event.target.closest('[data-hero]');
  if(hero) return openHero(hero.dataset.hero);
  const record = event.target.closest('[data-record]');
  if(record) return openRecord(Number(record.dataset.record));
  const filter = event.target.closest('[data-role]');
  if(filter) { selectedRole=filter.dataset.role; render(); }
  if(event.target.closest('[data-clear]')) { query='';selectedRole='All';render();document.querySelector('#search').focus(); }
  if(event.target.closest('#reset-tiers')) {
    if(!Object.keys(rankings).length) return;
    dialog.innerHTML='<div class="detail-body"><h1 id="detail-title">Reset your tier list?</h1><p>This removes the rankings saved in this browser. Export a copy first if you want to keep them.</p><div class="cluster"><button class="button secondary close-dialog-inline">Keep list</button><button class="button" id="confirm-reset">Reset rankings</button></div></div>';
    dialog.showModal();
  }
  if(event.target.closest('#export')) {
    const blob=new Blob([JSON.stringify({name:'My AOV tier list',type:'personal',rankings},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='liqidb-tier-list.json';a.click();URL.revokeObjectURL(a.href);
  }
});
main.addEventListener('input',event=>{
  if(event.target.id!=='search') return;
  const position=event.target.selectionStart;query=event.target.value;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(position,position);
});
main.addEventListener('change',event=>{
  if(event.target.id==='sort') { sort=event.target.value;render(); }
  if(event.target.dataset.rank) {
    const slug=event.target.dataset.rank;
    if(event.target.value) rankings[slug]=event.target.value; else delete rankings[slug];
    localStorage.setItem('liqidb-tiers',JSON.stringify(rankings));render();
    document.querySelector(`[data-rank="${CSS.escape(slug)}"]`)?.focus();
  }
});
dialog.addEventListener('click',event=>{
  if(event.target.closest('.close-dialog, .close-dialog-inline') || event.target === dialog) dialog.close();
  if(event.target.closest('#confirm-reset')) {rankings={};localStorage.removeItem('liqidb-tiers');dialog.close();render();}
});
window.addEventListener('hashchange',()=>{query='';selectedRole='All';dialog.close();render();window.scrollTo(0,0);});
document.addEventListener('keydown',event=>{
  if(event.key==='/' && !dialog.open && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {event.preventDefault();document.querySelector('#search')?.focus();}
});
document.addEventListener('error',event=>{
  if(event.target.tagName==='IMG') {event.target.style.visibility='hidden';event.target.parentElement.classList.add('art-unavailable');}
},true);
try {
  data = await import('./data.js');
  render();
} catch(error) {
  main.innerHTML='<section class="empty"><h1>The field guide could not load</h1><p>The local data snapshot is unavailable. Reload the page to try again.</p><button class="button" id="retry">Reload database</button></section>';
  document.querySelector('#retry').onclick=()=>location.reload();
  console.error(error);
}
