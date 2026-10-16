import './style.css';
import { glyph } from './icons.js';
import { createViewMotion } from './motion.js';

const main = document.querySelector('main');
const dialog = document.querySelector('#detail');
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role = hero => (hero.classes || []).join(' / ');
const portrait = hero => hero.portrait || hero.skins?.[0]?.thumb;
const art = hero => hero.skins?.[0]?.splash || portrait(hero);
const image = (url, alt, cls = '', eager = false) => url ? `<img src="${escape(url)}" alt="${escape(alt)}" class="${cls}" width="400" height="500" loading="${eager ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">` : `<span class="image-fallback">${escape(alt.slice(0, 1))}</span>`;
const normalize = value => data.normalize(value);
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let data, query = '', selectedRole = 'All', sort = 'name';
let rankings = readStored('liqidb-tiers', {});
const tiers = ['S', 'A', 'B', 'C', 'D'];
const motion = createViewMotion(main);
const theme = document.querySelector('#theme');
theme.value = localStorage.getItem('liqidb-theme') || 'system';
function setTheme() {
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem('liqidb-theme', theme.value);
}
theme.addEventListener('change', setTheme);
setTheme();
for (const link of document.querySelectorAll('[data-view]')) {
  const name = {heroes:'heroes', 'tier-list':'fighter', counters:'counter', items:'tank', runes:'rune', spells:'spell'}[link.dataset.view];
  link.insertAdjacentHTML('afterbegin', glyph(name));
}
for (const placeholder of document.querySelectorAll('span[data-icon]')) placeholder.innerHTML = glyph(placeholder.dataset.icon);
const view = () => {
  const route = location.hash.slice(1).split('/')[0];
  return ['heroes','counters','tier-list','items','runes','spells'].includes(route) ? route : 'heroes';
};

function header(title, subtitle, eyebrow = 'CẨM NANG LIÊN QUÂN MOBILE') {
  return `<section class="page-intro"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="intro-copy">${subtitle}</p></div><span class="source-badge"><span class="status-dot"></span> Dữ liệu mở từ cộng đồng</span></section>`;
}
function toolbar(type, count) {
  return `<div class="toolbar"><label class="search"><span>Tìm ${type}</span><div class="search-field"><span aria-hidden="true">${glyph('search')}</span><input id="search" type="search" placeholder="Nhập tên${type === 'tướng' ? ' hoặc danh hiệu' : ''}..." value="${escape(query)}" autocomplete="off"><kbd aria-hidden="true">/</kbd></div></label><label class="sort"><span>Sắp xếp</span><select id="sort"><option value="name"${sort === 'name' ? ' selected' : ''}>Tên: A đến Z</option><option value="reverse"${sort === 'reverse' ? ' selected' : ''}>Tên: Z đến A</option></select></label><span class="result-count" aria-live="polite">${count.toLocaleString('vi-VN')} ${type}</span></div>`;
}
function filtered(records) {
  return data.filterRecords(records, query, selectedRole).sort((a,b) => sort === 'reverse' ? b.name.localeCompare(a.name, 'vi') : a.name.localeCompare(b.name, 'vi'));
}
function heroCard(hero) {
  return `<button class="hero-card" data-hero="${escape(hero.slug)}" aria-label="Xem tướng ${escape(hero.name)}">${image(portrait(hero), hero.name)}<span class="card-scrim"></span><span class="hero-card-copy"><span class="hero-card-name">${escape(hero.name)}<span aria-hidden="true">${glyph('external')}</span></span><span class="hero-card-role">${escape(role(hero))}</span></span></button>`;
}
function empty() {
  return `<section class="empty"><span class="empty-symbol" aria-hidden="true">${glyph('search')}</span><h2>Chưa tìm thấy kết quả</h2><p>Thử tên khác hoặc xóa bộ lọc để xem toàn bộ cẩm nang.</p><button class="button" data-clear>Xóa bộ lọc</button></section>`;
}
function renderCounters() {
  const list = data.filterMatchups(query).sort((a, b) => {
    const name = pair => data.heroes.find(hero => hero.slug === pair.counter).name;
    return sort === 'reverse' ? name(b).localeCompare(name(a), 'vi') : name(a).localeCompare(name(b), 'vi');
  });
  const participant = (slug, label) => {
    const hero = data.heroes.find(hero => hero.slug === slug);
    return `<button class="matchup-hero" data-hero="${escape(slug)}" aria-label="Xem tướng ${escape(hero.name)}">${image(portrait(hero), hero.name)}<span><small>${label}</small><strong>${escape(hero.name)}</strong><span>${escape(role(hero))}</span></span></button>`;
  };
  main.innerHTML = `<div class="content">${header('Chọn tướng. Đổi thế đối đầu.', 'Tìm lựa chọn khắc chế theo bộ kỹ năng, hiểu cách đánh và giới hạn của từng cặp.', 'CẨM NANG KHẮC CHẾ')}
    <aside class="matchup-notice">${glyph('info')}<div><strong>Mũi tên chỉ hướng khắc chế, không phải bảo đảm thắng.</strong><p>Các cặp được tuyển chọn có nguồn tham khảo, không bao phủ mọi tướng. Hiệu quả còn phụ thuộc phiên bản, kỹ năng, trang bị và phối hợp. Đọc điều kiện trước khi chọn.</p></div></aside>
    ${toolbar('cặp đối đầu', list.length)}<div id="results">${list.length ? `<div class="matchup-grid">${list.map(pair => `<article class="matchup-card"><div class="matchup-pair">${participant(pair.counter, 'Lựa chọn khắc chế')}<span class="matchup-direction">${glyph('arrow')}<span class="sr-only">khắc chế</span></span>${participant(pair.target, 'Tướng đối phương')}</div><div class="matchup-copy"><h2>Vì sao hiệu quả?</h2><p>${escape(pair.reason)}</p><h3>Điều kiện &amp; giới hạn</h3><p>${escape(pair.limitation)}</p><div class="matchup-sources"><span>${pair.basis === 'explicit' ? 'Nguồn phân tích cặp đấu' : 'Phân tích từ cơ chế kỹ năng'}</span>${pair.sources.map(source => `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title)} ${glyph('external')}</a>`).join('')}</div></div></article>`).join('')}</div>` : empty()}</div><p class="data-caption">Đối chiếu nguồn ngày ${new Date(`${data.counterGuide.reviewedAt}T00:00:00`).toLocaleDateString('vi-VN')}. Không phải bảng tỷ lệ thắng hay xếp hạng sức mạnh hiện tại.</p></div>`;
}
function renderHeroes() {
  const list = filtered(data.heroes);
  const feature = data.heroes.find(h => h.slug === 'airi') || data.heroes[0];
  main.innerHTML = `<div class="content">${header('Hiểu tướng. Chọn lối chơi.', 'Tra cứu kỹ năng, trang bị và tìm vị tướng phù hợp với bạn.')}
  <section class="feature"><img class="feature-art" src="${escape(art(feature))}" alt="Hình ảnh chính thức của ${escape(feature.name)}" width="1200" height="500" fetchpriority="high"><div class="feature-scrim"></div><div class="feature-copy"><p class="eyebrow">KHÁM PHÁ TƯỚNG</p><h2>Nắm rõ kỹ năng.<br>Tự tin giao tranh.</h2><p>Tìm lối chơi của bạn, hiểu từng chiêu thức.<br>Sẵn sàng cho trận đấu tiếp theo.</p><button class="button" data-hero="${feature.slug}">Khám phá ${escape(feature.name)} <span>${glyph('external')}</span></button></div><div class="feature-catalog"><a href="#items"><strong>${data.items.length}</strong><span>trang bị</span></a><a href="#runes"><strong>${data.runes.length}</strong><span>ngọc</span></a><a href="#spells"><strong>${data.spells.length}</strong><span>phép bổ trợ</span></a></div><span class="feature-caption">${escape(feature.name)}<small>${escape(feature.title)}</small></span></section>
  <section class="roster"><div class="section-heading"><h2>Danh sách tướng <span>${data.heroes.length}</span></h2><a href="#tier-list">Tạo bảng xếp hạng ${glyph('arrow')}</a></div>
  <div class="role-filters" role="group" aria-label="Lọc tướng theo vai trò">${['All','Đấu sĩ','Sát thủ','Pháp sư','Xạ thủ','Đỡ đòn','Trợ thủ'].map((r,i)=>`<button data-role="${r}" aria-pressed="${selectedRole === r}" class="${selectedRole === r ? 'selected' : ''}"><span class="role-glyph" aria-hidden="true">${glyph(['heroes','fighter','counter','mage','arrow','tank','support'][i])}</span>${r === 'All' ? 'Tất cả tướng' : r}</button>`).join('')}</div>
  ${toolbar('tướng', list.length)}<div id="results">${list.length ? `<div class="hero-grid">${list.map(heroCard).join('')}</div>` : empty()}</div></section>
  <aside class="guide-note"><span class="note-mark">${glyph('info')}</span><div><strong>Tra cứu từ nguồn dữ liệu mở.</strong><p>Kỹ năng và chỉ số được giữ nguyên từ nguồn gốc. Thông tin tham khảo có thể khác phiên bản đang chơi.</p></div><a href="https://github.com/MLuc24/lien-quan-data" target="_blank" rel="noreferrer">Xem dữ liệu gốc ${glyph('external')}</a></aside></div>`;
}
const collectionNames = {items:['Trang bị','Lên đồ cho từng trận đấu.','Tra cứu chỉ số, giá vàng và nội tại của từng trang bị.'],runes:['Ngọc','Chọn ngọc, định hình lối chơi.','Khám phá hiệu ứng và cấp ngọc để hoàn thiện bảng ngọc của bạn.'],spells:['Phép bổ trợ','Một phép, đổi thế trận.','Hiểu rõ phép bổ trợ trước khi bước vào giao tranh.']};
function recordCard(record, index) {
  const text = record.description || record.effect || record.effects || record.stats || '';
  const preview = typeof text === 'string' ? text : Array.isArray(text) ? text.map(t => typeof t === 'string' ? t : `${t.label || t.name || ''} ${t.value || ''}`).join(' / ') : '';
  return `<button class="record-card" data-record="${index}"><div class="record-top">${image(record.icon || record.image || record.portrait, record.name)}<div><h2>${escape(record.name)}</h2><span>${escape(record.gold ? `${record.gold.toLocaleString('vi-VN')} vàng` : record.tier ? `Cấp ${record.tier}` : record.cooldown ? `Hồi chiêu: ${record.cooldown}` : 'Thông tin tham khảo')}</span></div><span aria-hidden="true">${glyph('external')}</span></div><p>${escape(preview.slice(0,180)) || 'Xem hiệu ứng và thông tin chi tiết.'}</p></button>`;
}
function renderCollection(type) {
  const [title, headline, subtitle] = collectionNames[type];
  const list = filtered(data[type]);
  main.innerHTML = `<div class="content">${header(headline, subtitle, `CẨM NANG ${title.toLocaleUpperCase('vi-VN')}`)}${toolbar(title.toLocaleLowerCase('vi-VN'),list.length)}<div id="results">${list.length ? `<div class="record-grid">${list.map(r => recordCard(r, data[type].indexOf(r))).join('')}</div>` : empty()}</div><p class="data-caption">Dữ liệu nguồn ngày ${new Date(data.meta.snapshotDate).toLocaleDateString('vi-VN',{year:'numeric',month:'long',day:'numeric'})}. Chọn một mục để xem thông tin đầy đủ.</p></div>`;
}
function tierHero(hero) {
  const rank = tiers.includes(rankings[hero.slug]) ? rankings[hero.slug] : '';
  return `<div class="tier-hero">${image(portrait(hero),hero.name)}<span>${escape(hero.name)}</span><label><span class="sr-only">Bậc xếp hạng của ${escape(hero.name)}</span><select data-rank="${escape(hero.slug)}" aria-label="Bậc xếp hạng của ${escape(hero.name)}"><option value=""${!rank ? ' selected' : ''}>Chưa xếp</option>${tiers.map(t=>`<option${rank===t?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
}
function renderTiers() {
  const pool = filtered(data.heroes).filter(h => !tiers.includes(rankings[h.slug]));
  const rankedCount = data.heroes.filter(h => tiers.includes(rankings[h.slug])).length;
  main.innerHTML = `<div class="content">${header('Xếp hạng theo cách bạn chơi.', 'Tạo bảng xếp hạng tướng theo trải nghiệm của riêng bạn.', 'BẢNG XẾP HẠNG CÁ NHÂN')}
  <div class="tier-notice"><span class="note-mark">${glyph('info')}</span><p><strong>Đây là đánh giá cá nhân, không phải xếp hạng thi đấu.</strong> Nguồn dữ liệu không có bậc sức mạnh hay tỷ lệ thắng. Lựa chọn của bạn được tự động lưu trong trình duyệt này.</p></div>
  <div class="section-heading"><h2>Bảng của tôi <span>${rankedCount} tướng đã xếp</span></h2><div class="cluster"><button class="button secondary" id="export">Tải tệp JSON ${glyph('download')}</button><button class="button secondary" id="reset-tiers"${rankedCount ? '' : ' disabled'}>Đặt lại bảng</button></div></div>
  <section class="tier-board" aria-label="Bảng xếp hạng cá nhân">${tiers.map(t => `<div class="tier-row"><h2>${t}<small>BẬC</small></h2><div class="tier-members">${data.heroes.filter(h => rankings[h.slug] === t).map(tierHero).join('') || `<p class="tier-empty">Chọn bậc ${t} trong danh sách bên dưới mỗi tướng.</p>`}</div></div>`).join('')}</section>
  <div class="section-heading pool-heading"><h2>Tướng chưa xếp hạng <span>${data.heroes.length-rankedCount}</span></h2></div>${toolbar('tướng',pool.length)}<section class="tier-pool">${pool.map(tierHero).join('') || '<p class="tier-empty">Không có tướng chưa xếp hạng phù hợp với tìm kiếm.</p>'}</section><p id="save-status" class="data-caption" role="status">Đã lưu trong trình duyệt. Tải tệp JSON để giữ một bản sao.</p></div>`;
}
function render(animate = false) {
  motion.clear();
  const current = view();
  for (const link of document.querySelectorAll('[data-view]')) {
    link.classList.toggle('active', link.dataset.view === current);
    if (link.dataset.view === current) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  document.title = `${current === 'heroes' ? 'Tướng' : current === 'counters' ? 'Cặp khắc chế' : current === 'tier-list' ? 'Bảng xếp hạng cá nhân' : collectionNames[current][0]} - LiQiDB`;
  if (current === 'heroes') renderHeroes(); else if (current === 'counters') renderCounters(); else if (current === 'tier-list') renderTiers(); else renderCollection(current);
  if (animate) motion.enter();
}
function detailSources(sources = {}) {
  return `<section class="detail-section sources"><h2>Nguồn dữ liệu và ghi công</h2><p>Dữ liệu và hình ảnh thuộc Garena / TiMi Studios. Nội dung từ cộng đồng Arena of Valor Fandom và bản dịch tiểu sử được chia sẻ theo giấy phép <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.</p><div class="cluster">${Object.entries(sources).filter(([,url])=> typeof url === 'string' && /^https?:\/\//.test(url)).map(([label,url])=>`<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape({garena:'Garena',fandomVi:'Wiki tiếng Việt',fandomEn:'Wiki quốc tế'}[label] || 'Nguồn tham khảo')} ${glyph('external')}</a>`).join('')}<a href="https://github.com/MLuc24/lien-quan-data" target="_blank" rel="noreferrer">Dữ liệu gốc từ MLuc24 ${glyph('external')}</a></div></section>`;
}
function openHero(slug) {
  const hero = data.heroes.find(h=>h.slug===slug);
  if (!hero) return;
  const lore = data.loreVi?.[hero.slug] || [];
  const pairs = data.matchups.filter(pair => pair.counter === slug || pair.target === slug);
  dialog.innerHTML = `<button class="close-dialog" aria-label="Đóng chi tiết tướng">${glyph('close')}</button><div class="detail-art">${image(art(hero),hero.name,'',true)}<div class="detail-title"><p class="eyebrow">${escape(role(hero))} &nbsp; / &nbsp; ${escape(hero.lane || 'Athanor')}</p><h1 id="detail-title">${escape(hero.name)}</h1><p>${escape(hero.title)}</p></div></div><div class="detail-body"><section class="detail-section"><h2>Chỉ số cơ bản</h2><div class="stats-grid">${(hero.stats || []).map(s=>`<div><span>${escape(s.label)}</span><strong>${renderValue(s.value)}</strong></div>`).join('') || '<p>Nguồn dữ liệu chưa cung cấp chỉ số cơ bản.</p>'}</div></section><section class="detail-section"><h2>Kỹ năng <small>Nội dung từ nguồn dữ liệu gốc</small></h2><div class="skills">${(hero.skills || []).map(s=>`<article class="skill">${image(s.icon,s.name)}<div><span class="eyebrow">${escape(s.slotLabel)}</span><h3>${escape(s.name)}</h3><p>${escape(s.description)}</p></div></article>`).join('')}</div></section>
  <section class="detail-section"><h2>Trang bị gợi ý</h2>${(hero.build?.itemSets || []).map((set,i)=>`<h3>Bộ trang bị ${i+1}</h3><div class="build-items">${set.map(name=>{const item=data.items.find(it=>normalize(it.name)===normalize(name));return `<div>${item?image(item.icon||item.image,name):''}<span>${escape(name)}</span></div>`}).join('')}</div>`).join('') || '<p>Nguồn dữ liệu chưa có bộ trang bị gợi ý.</p>'}${(hero.build?.notes||[]).map(n=>`<p>${escape(n)}</p>`).join('')}</section><section class="detail-section"><h2>Tiểu sử tướng</h2>${lore.length ? lore.map(paragraph=>`<p class="lore">${escape(paragraph)}</p>`).join('') : '<p>Nguồn dữ liệu chưa có tiểu sử cho tướng này.</p>'}</section>${detailSources(hero.sources)}</div>`;
  const matchups = document.createElement('section');
  matchups.className = 'detail-section hero-matchups';
  matchups.innerHTML = `<h2>${glyph('counter')} Cặp khắc chế</h2><p>${pairs.length ? `${pairs.length} cặp có phân tích cho ${escape(hero.name)} trong cẩm nang.` : 'Cẩm nang chưa có phân tích cặp đấu cho tướng này.'}</p><a class="button secondary" href="#counters${pairs.length ? `/${escape(slug)}` : ''}">${pairs.length ? 'Xem cặp đối đầu liên quan' : 'Khám phá các cặp đã có'} ${glyph('arrow')}</a>`;
  dialog.querySelector('.detail-body').prepend(matchups);
  dialog.showModal();
  dialog.scrollTop = 0;
}
function humanize(key) {
  return {group:'Loại trang bị',tier:'Cấp',gold:'Giá vàng',stats:'Chỉ số',passives:'Nội tại',rawName:'Tên trong nguồn',color:'Màu ngọc',description:'Mô tả',seasonal:'Theo mùa'}[key] || 'Thông tin bổ sung';
}
function renderValue(value) {
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') return escape(value.toLocaleString('vi-VN'));
  if (Array.isArray(value)) return `<ul>${value.map(v=>`<li>${renderValue(v)}</li>`).join('')}</ul>`;
  if (value && typeof value === 'object') return `<dl>${Object.entries(value).map(([k,v])=>`<dt>${escape(humanize(k))}</dt><dd>${renderValue(v)}</dd>`).join('')}</dl>`;
  const translated = {Melee:'Cận chiến',Meele:'Cận chiến',Ranged:'Đánh xa',Range:'Đánh xa','Long Range':'Tầm xa',Near:'Tầm gần',Medium:'Tầm trung','Skill 2':'Chiêu 2','Ranged / Melee':'Đánh xa / Cận chiến','0 / 0% - inf/inf% (When trigger passive)':'0 / 0% – ∞ / ∞% (khi kích hoạt nội tại)'}[value];
  if (/^\d+(?:\.\d+)?$/.test(value)) return escape(Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 20 }));
  return escape(translated ?? value);
}
function openRecord(index) {
  const r = data[view()][index];
  const factFields = ['group', 'tier', 'gold', 'color', 'seasonal', 'rawName'];
  dialog.innerHTML = `<button class="close-dialog" aria-label="Đóng thông tin chi tiết">${glyph('close')}</button><div class="detail-body record-detail"><div class="record-heading">${image(r.icon||r.image,r.name,'record-icon',true)}<div><p class="eyebrow">CẨM NANG ${collectionNames[view()][0].toLocaleUpperCase('vi-VN')}</p><h1 id="detail-title">${escape(r.name)}</h1></div></div><div class="record-facts">${Object.entries(r).filter(([k])=>factFields.includes(k)).map(([k,v])=>`<div><span>${escape(humanize(k))}</span><strong>${renderValue(v)}</strong></div>`).join('')}</div>${Object.entries(r).filter(([k])=> !['name','slug','icon','image','sources','searchKey','portrait',...factFields].includes(k)).map(([k,v])=>`<section class="detail-section"><h2>${escape(humanize(k))}</h2><div>${renderValue(v)}</div></section>`).join('')}${detailSources(r.sources)}</div>`;
  dialog.showModal();
  dialog.scrollTop = 0;
}
main.addEventListener('click',event=>{
  const hero = event.target.closest('[data-hero]');
  if(hero) return openHero(hero.dataset.hero);
  const record = event.target.closest('[data-record]');
  if(record) return openRecord(Number(record.dataset.record));
  const filter = event.target.closest('[data-role]');
  if(filter) { selectedRole=filter.dataset.role; render(); document.querySelector(`[data-role="${CSS.escape(selectedRole)}"]`).focus({preventScroll:true}); }
  if(event.target.closest('[data-clear]')) { query='';selectedRole='All';render();document.querySelector('#search').focus(); }
  if(event.target.closest('#reset-tiers')) {
    if(!Object.keys(rankings).length) return;
    dialog.innerHTML='<div class="detail-body"><h1 id="detail-title">Đặt lại bảng xếp hạng?</h1><p>Thao tác này xóa các bậc đã lưu trong trình duyệt. Hãy tải tệp JSON trước nếu bạn muốn giữ một bản sao.</p><div class="cluster"><button class="button secondary close-dialog-inline">Giữ nguyên</button><button class="button destructive" id="confirm-reset">Xóa xếp hạng</button></div></div>';
    dialog.showModal();
  }
  if(event.target.closest('#export')) {
    const blob=new Blob([JSON.stringify({name:'Bảng xếp hạng Liên Quân của tôi',type:'personal',rankings},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='liqidb-xep-hang.json';a.click();URL.revokeObjectURL(a.href);
  }
});
main.addEventListener('input',event=>{
  if(event.target.id!=='search') return;
  const position=event.target.selectionStart;query=event.target.value;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(position,position);
});
main.addEventListener('change',event=>{
  if(event.target.id==='sort') { sort=event.target.value;render();document.querySelector('#sort').focus({preventScroll:true}); }
  if(event.target.dataset.rank) {
    const slug=event.target.dataset.rank;
    if(event.target.value) rankings[slug]=event.target.value; else delete rankings[slug];
    localStorage.setItem('liqidb-tiers',JSON.stringify(rankings));render();
    document.querySelector(`[data-rank="${CSS.escape(slug)}"]`)?.focus();
  }
});
dialog.addEventListener('click',event=>{
  if(event.target.closest('.hero-matchups a')) dialog.close();
  if(event.target.closest('.close-dialog, .close-dialog-inline') || event.target === dialog) dialog.close();
  if(event.target.closest('#confirm-reset')) {rankings={};localStorage.removeItem('liqidb-tiers');dialog.close();render();}
});
function routeQuery() {
  const slug = view() === 'counters' ? location.hash.split('/')[1] : '';
  query = data.heroes.find(hero => hero.slug === slug)?.name || '';
}
window.addEventListener('hashchange',()=>{routeQuery();selectedRole='All';dialog.close();render(true);window.scrollTo(0,0);});
document.addEventListener('keydown',event=>{
  if(event.key==='/' && !dialog.open && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {event.preventDefault();document.querySelector('#search')?.focus();}
});
document.addEventListener('error',event=>{
  if(event.target.tagName==='IMG') {event.target.style.visibility='hidden';event.target.parentElement.classList.add('art-unavailable');}
},true);
try {
  data = await import('./data.js');
  routeQuery();
  render(true);
} catch(error) {
  main.innerHTML='<section class="empty"><h1>Chưa tải được cẩm nang</h1><p>Không thể đọc dữ liệu của trang. Hãy tải lại để thử lần nữa.</p><button class="button" id="retry">Tải lại dữ liệu</button></section>';
  document.querySelector('#retry').onclick=()=>location.reload();
  console.error(error);
}
