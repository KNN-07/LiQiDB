import './style.css';
import './reference.css';
import { glyph } from './icons.js';
import { createViewMotion } from './motion.js';
import { renderSeason, renderHeroSeason } from './season.js';
import { renderHeroWiki } from './wiki.js';
import { renderHeroMatchups, renderCounterScore, renderMatchupAnalysis, renderScoreMethod } from './matchups.js';
import { renderGraphBrowser, renderGraphDetail, renderHeroGraph } from './graph-view.js';
import { draftState, renderDraft } from './draft-view.js';

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
let counterLimit = 12, catalogSource = 'snapshot';
let counterMode = 'reviewed';
const graphState = {counter:'',target:'',status:'inferred'};
const seasonState = { lane: 'all', className: 'All', trend: 'all', spotlight: 'top' };
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
  const name = {meta:'rune', heroes:'heroes', 'tier-list':'fighter', counters:'counter', draft:'heroes', items:'tank', runes:'rune', spells:'spell'}[link.dataset.view];
  link.insertAdjacentHTML('afterbegin', glyph(name));
}
for (const placeholder of document.querySelectorAll('span[data-icon]')) placeholder.innerHTML = glyph(placeholder.dataset.icon);
const view = () => {
  const route = location.hash.slice(1).split('/')[0];
  return ['meta','heroes','counters','draft','tier-list','items','runes','spells'].includes(route) ? route : 'meta';
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
function renderDraftPage() {
  main.innerHTML = `<div class="content">${header('Dựng đội hình. Tính nước đi.', 'Cân nhắc lựa chọn và lượt cấm từ cơ chế của hai đội.', 'TRỢ LÝ CẤM CHỌN')}${renderDraft(data)}</div>`;
}
function renderCounters() {
  const modeControl = `<label class="sort counter-mode"><span>Cách tra cứu</span><select id="counter-mode"><option value="reviewed"${counterMode==='reviewed'?' selected':''}>Phân tích đã đối chiếu</option><option value="graph"${counterMode==='graph'?' selected':''}>Đồ thị cơ chế</option></select></label>`;
  if(counterMode==='graph') {
    main.innerHTML = `<div class="content">${header('Mọi đối thủ. Từng cơ chế.', 'Tra đường suy luận có nguồn, xem cả tương tác hỗ trợ và phản ứng ngược.', 'CẨM NANG KHẮC CHẾ')}${modeControl}${renderGraphBrowser(data,query,graphState,counterLimit,toolbar,sort)}</div>`;
    return;
  }
  const name = pair => data.heroes.find(hero => hero.slug === pair.counter).name;
  const list = data.filterMatchups(query).sort((a, b) => b.analysis.score - a.analysis.score || (sort === 'reverse' ? name(b).localeCompare(name(a), 'vi') : name(a).localeCompare(name(b), 'vi')));
  const participant = (slug, label) => {
    const hero = data.heroes.find(hero => hero.slug === slug);
    return `<button class="matchup-hero" data-hero="${escape(slug)}" aria-label="Xem tướng ${escape(hero.name)}">${image(portrait(hero), hero.name)}<span><small>${label}</small><strong>${escape(hero.name)}</strong><span>${escape(role(hero))}</span></span></button>`;
  };
  main.innerHTML = `<div class="content">${header('Chọn tướng. Hiểu cách đối phó.', 'Phân tích cơ chế, cửa sổ phản ứng và giới hạn của từng cặp đối đầu.', 'CẨM NANG KHẮC CHẾ')}
    <aside class="matchup-notice">${glyph('info')}<div><strong>${data.matchups.length} phân tích có điểm · ${data.counterGuide.unverifiedCandidates.length} giả thuyết chưa chấm.</strong><p>${escape(data.counterGuide.scope)}</p><p>Mũi tên đi từ lựa chọn khắc chế đến tướng bị đối phó. Điểm là nhận định biên tập, không phải bảo đảm thắng. Xếp theo điểm giảm dần; bộ chọn tên áp dụng khi bằng điểm.</p></div></aside>
    ${modeControl}${renderScoreMethod(data)}${toolbar('cặp đối đầu', list.length)}<div id="results">${list.length ? `<div class="matchup-grid">${list.slice(0,counterLimit).map((pair,index) => `<article class="matchup-card" data-matchup-index="${index}" data-counter="${escape(pair.counter)}" data-target="${escape(pair.target)}" tabindex="-1"><div class="matchup-pair">${participant(pair.counter, 'Lựa chọn khắc chế')}<span class="matchup-direction">${glyph('arrow')}<span class="sr-only">khắc chế</span></span>${participant(pair.target, 'Tướng đối phương')}</div><div class="matchup-copy">${renderCounterScore(data,pair)}<h2>Vì sao hiệu quả?</h2><p>${escape(pair.reason)}</p><h3>Điều kiện &amp; giới hạn</h3><p>${escape(pair.limitation)}</p>${renderMatchupAnalysis(data,pair)}</div></article>`).join('')}</div><div class="counter-more"><p class="data-caption" aria-live="polite">Đang hiển thị ${Math.min(counterLimit,list.length)} / ${list.length} cặp</p>${list.length > counterLimit ? '<button class="button secondary" id="counter-more">Xem thêm 12 cặp</button>' : ''}</div>` : empty()}</div>
    <details class="unverified-matchups"><summary>Giả thuyết chưa đủ căn cứ · không phải khuyến nghị</summary><p>Không chấm điểm khi chưa xác minh được tương tác trung tâm. Có thể tra cứu chi tiết trong hồ sơ hai tướng.</p>${data.counterGuide.unverifiedCandidates.map(pair=>`<p><button class="button secondary" data-hero="${escape(pair.target)}">${escape(data.heroes.find(hero=>hero.slug===pair.counter).name)} → ${escape(data.heroes.find(hero=>hero.slug===pair.target).name)}</button> ${escape(pair.analysis.scoreReason)}</p>`).join('')}</details></div>`;
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
function collectionRecords(type) {
  return catalogSource === 'reference' ? data.referenceBuilds[{items:'itemCatalog',runes:'arcanaCatalog',spells:'spellCatalog'}[type]] : data[type];
}
function renderCollection(type) {
  const [title, headline, subtitle] = collectionNames[type];
  const records = collectionRecords(type);
  const list = filtered(records);
  main.innerHTML = `<div class="content">${header(headline, subtitle, `CẨM NANG ${title.toLocaleUpperCase('vi-VN')}`)}<label class="catalog-source sort"><span>Nguồn dữ liệu</span><select id="catalog-source"><option value="snapshot"${catalogSource==='snapshot'?' selected':''}>Garena / Fandom · lần thu thập 16/10</option><option value="reference"${catalogSource==='reference'?' selected':''}>TierLQ · bộ dữ liệu tham khảo</option></select></label>${toolbar(title.toLocaleLowerCase('vi-VN'),list.length)}<div id="results">${list.length ? `<div class="record-grid">${list.map(r => recordCard(r, records.indexOf(r))).join('')}</div>` : empty()}</div><p class="data-caption">${catalogSource==='reference'?'Bản tham khảo TierLQ, nhập ngày 16/10/2026; không coi là chỉ số sau mọi cập nhật cân bằng. Nguồn gốc ở từng mục.':'Lần thu thập nguồn ngày '+new Date(data.meta.snapshotDate).toLocaleDateString('vi-VN',{year:'numeric',month:'long',day:'numeric'})}. Chọn một mục để xem thông tin đầy đủ.</p></div>`;
}
function tierHero(hero) {
  const rank = tiers.includes(rankings[hero.slug]) ? rankings[hero.slug] : '';
  return `<div class="tier-hero">${image(portrait(hero),hero.name)}<span>${escape(hero.name)}</span><label><span class="sr-only">Bậc xếp hạng của ${escape(hero.name)}</span><select data-rank="${escape(hero.slug)}" aria-label="Bậc xếp hạng của ${escape(hero.name)}"><option value=""${!rank ? ' selected' : ''}>Chưa xếp</option>${tiers.map(t=>`<option${rank===t?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
}
function renderTiers() {
  const pool = filtered(data.heroes).filter(h => !tiers.includes(rankings[h.slug]));
  const rankedCount = data.heroes.filter(h => tiers.includes(rankings[h.slug])).length;
  main.innerHTML = `<div class="content">${header('Xếp hạng theo cách bạn chơi.', 'Tạo bảng xếp hạng tướng theo trải nghiệm của riêng bạn.', 'BẢNG XẾP HẠNG CÁ NHÂN')}
  <div class="tier-notice"><span class="note-mark">${glyph('info')}</span><p><strong>Đây là đánh giá cá nhân, không phải xếp hạng thi đấu.</strong> Bảng này độc lập với tier cộng đồng trong mục Meta mùa. Lựa chọn của bạn được tự động lưu trong trình duyệt này.</p></div>
  <div class="section-heading"><h2>Bảng của tôi <span>${rankedCount} tướng đã xếp</span></h2><div class="cluster"><button class="button secondary" id="export">Tải tệp JSON ${glyph('download')}</button><button class="button secondary" id="reset-tiers"${rankedCount ? '' : ' disabled'}>Đặt lại bảng</button></div></div>
  <section class="tier-board" aria-label="Bảng xếp hạng cá nhân">${tiers.map(t => `<div class="tier-row"><h2>${t}<small>BẬC</small></h2><div class="tier-members">${data.heroes.filter(h => rankings[h.slug] === t).map(tierHero).join('') || `<p class="tier-empty">Chọn bậc ${t} trong danh sách bên dưới mỗi tướng.</p>`}</div></div>`).join('')}</section>
  <div class="section-heading pool-heading"><h2>Tướng chưa xếp hạng <span>${data.heroes.length-rankedCount}</span></h2></div>${toolbar('tướng',pool.length)}<section class="tier-pool">${pool.map(tierHero).join('') || '<p class="tier-empty">Không có tướng chưa xếp hạng phù hợp với tìm kiếm.</p>'}</section><p id="save-status" class="data-caption" role="status">Đã lưu trong trình duyệt. Tải tệp JSON để giữ một bản sao.</p></div>`;
}
function render(animate = false) {
  motion.clear();
  const current = view();
  document.documentElement.dataset.route = current;
  for (const link of document.querySelectorAll('[data-view]')) {
    link.classList.toggle('active', link.dataset.view === current);
    if (link.dataset.view === current) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  document.title = `${current === 'meta' ? 'Meta mùa S4 2026' : current === 'heroes' ? 'Tướng' : current === 'counters' ? 'Cặp khắc chế' : current === 'draft' ? 'Cấm chọn' : current === 'tier-list' ? 'Bảng xếp hạng cá nhân' : collectionNames[current][0]} - LiQiDB`;
  if (current === 'meta') main.innerHTML = renderSeason(data, query, seasonState); else if (current === 'heroes') renderHeroes(); else if (current === 'counters') renderCounters(); else if (current === 'draft') renderDraftPage(); else if (current === 'tier-list') renderTiers(); else renderCollection(current);
  if (animate) motion.enter();
}
function detailSources(sources = {}) {
  return `<section class="detail-section sources"><h2>Nguồn dữ liệu và ghi công</h2><p>Dữ liệu và hình ảnh thuộc Garena / TiMi Studios. Nội dung từ cộng đồng Arena of Valor Fandom và bản dịch tiểu sử được chia sẻ theo giấy phép <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>.</p><div class="cluster">${Object.entries(sources).filter(([,url])=> typeof url === 'string' && /^https?:\/\//.test(url)).map(([label,url])=>`<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape({garena:'Garena',fandomVi:'Wiki tiếng Việt',fandomEn:'Wiki quốc tế'}[label] || 'Nguồn tham khảo')} ${glyph('external')}</a>`).join('')}<a href="https://github.com/MLuc24/lien-quan-data" target="_blank" rel="noreferrer">Dữ liệu gốc từ MLuc24 ${glyph('external')}</a></div></section>`;
}
function openHero(slug) {
  const hero = data.heroes.find(h=>h.slug===slug);
  if (!hero) return;
  const lore = data.loreVi?.[hero.slug] || [];
  dialog.innerHTML = `<button class="close-dialog" aria-label="Đóng chi tiết tướng">${glyph('close')}</button><div class="detail-art">${image(art(hero),hero.name,'',true)}<div class="detail-title"><p class="eyebrow">${escape(role(hero))} &nbsp; / &nbsp; ${escape(hero.lane || 'Athanor')}</p><h1 id="detail-title">${escape(hero.name)}</h1><p>${escape(hero.title)}</p></div></div><div class="detail-body"><section class="detail-section"><h2>Chỉ số cơ bản</h2><div class="stats-grid">${(hero.stats || []).map(s=>`<div><span>${escape(s.label)}</span><strong>${renderValue(s.value)}</strong></div>`).join('') || '<p>Nguồn dữ liệu chưa cung cấp chỉ số cơ bản.</p>'}</div></section><section class="detail-section"><h2>Kỹ năng <small>Nội dung từ nguồn dữ liệu gốc</small></h2><div class="skills">${(hero.skills || []).map(s=>`<article class="skill">${image(s.icon,s.name)}<div><span class="eyebrow">${escape(s.slotLabel)}</span><h3>${escape(s.name)}</h3><p>${escape(s.description)}</p></div></article>`).join('')}</div></section>
  <section class="detail-section"><h2>Trang bị gợi ý</h2>${(hero.build?.itemSets || []).map((set,i)=>`<h3>Bộ trang bị ${i+1}</h3><div class="build-items">${set.map(name=>{const item=data.items.find(it=>normalize(it.name)===normalize(name));return `<div>${item?image(item.icon||item.image,name):''}<span>${escape(name)}</span></div>`}).join('')}</div>`).join('') || '<p>Nguồn dữ liệu chưa có bộ trang bị gợi ý.</p>'}${(hero.build?.notes||[]).map(n=>`<p>${escape(n)}</p>`).join('')}</section><section class="detail-section"><h2>Tiểu sử tướng</h2>${lore.length ? lore.map(paragraph=>`<p class="lore">${escape(paragraph)}</p>`).join('') : '<p>Nguồn dữ liệu chưa có tiểu sử cho tướng này.</p>'}</section>${detailSources(hero.sources)}</div>`;
  const matchups = document.createElement('section');
  matchups.className = 'detail-section hero-matchups';
  matchups.innerHTML = renderHeroMatchups(data, slug) + renderHeroGraph(data, slug);
  dialog.querySelector('.detail-body').prepend(matchups);
  matchups.insertAdjacentHTML('afterend', renderHeroWiki(data, slug));
  const seasonContext = document.createElement('div');
  seasonContext.className = 'hero-season-context';
  seasonContext.innerHTML = renderHeroSeason(data, slug);
  dialog.querySelector('.detail-body').prepend(seasonContext);
  dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector('.close-dialog').focus({preventScroll:true});
}
function humanize(key) {
  return {group:'Loại trang bị',tier:'Cấp',gold:'Giá vàng',stats:'Chỉ số',passives:'Nội tại',rawName:'Tên trong nguồn',color:'Màu ngọc',description:'Mô tả',seasonal:'Theo mùa'}[key] || 'Thông tin bổ sung';
}
function openGraphPair(key) {
  const [counter,target] = key.split(':');
  dialog.innerHTML = `<button class="close-dialog" aria-label="Đóng phân tích cơ chế">${glyph('close')}</button><div class="detail-body graph-detail">${renderGraphDetail(data,counter,target)}</div>`;
  dialog.showModal();
  dialog.scrollTop=0;
  dialog.querySelector('.close-dialog').focus({preventScroll:true});
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
  const r = collectionRecords(view())[index];
  const factFields = ['group', 'tier', 'gold', 'color', 'seasonal', 'rawName'];
  dialog.innerHTML = `<button class="close-dialog" aria-label="Đóng thông tin chi tiết">${glyph('close')}</button><div class="detail-body record-detail"><div class="record-heading">${image(r.icon||r.image,r.name,'record-icon',true)}<div><p class="eyebrow">CẨM NANG ${collectionNames[view()][0].toLocaleUpperCase('vi-VN')}</p><h1 id="detail-title">${escape(r.name)}</h1></div></div><div class="record-facts">${Object.entries(r).filter(([k])=>factFields.includes(k)).map(([k,v])=>`<div><span>${escape(humanize(k))}</span><strong>${renderValue(v)}</strong></div>`).join('')}</div>${Object.entries(r).filter(([k])=> !['name','slug','icon','image','sources','searchKey','portrait',...factFields].includes(k)).map(([k,v])=>`<section class="detail-section"><h2>${escape(humanize(k))}</h2><div>${renderValue(v)}</div></section>`).join('')}${detailSources(r.sources)}</div>`;
  dialog.showModal();
  dialog.scrollTop = 0;
}
main.addEventListener('click',event=>{
  const draftAdd = event.target.closest('[data-draft-add]');
  if(draftAdd) {
    if(draftAdd.dataset.draftAdd === 'pick') {
      const slot = draftState.allies.indexOf('');
      if(slot < 0) return;
      draftState.allies[slot] = draftAdd.dataset.slug;
      render(); document.querySelector(`#draft-allies-${slot}`).focus({preventScroll:true});
    } else {
      draftState.bans.push(draftAdd.dataset.slug);
      render(); document.querySelector('#draft-ban').focus({preventScroll:true});
    }
    return;
  }
  const unban = event.target.closest('[data-draft-unban]');
  if(unban) {
    draftState.bans = draftState.bans.filter(slug => slug !== unban.dataset.draftUnban);
    render(); document.querySelector('#draft-ban').focus({preventScroll:true}); return;
  }
  if(event.target.closest('#draft-reset')) {
    draftState.allies.fill(''); draftState.enemies.fill(''); draftState.bans = [];
    draftState.search = ''; draftState.role = 'All'; draftState.limit = 6;
    render(); document.querySelector('#draft-allies-0').focus({preventScroll:true}); return;
  }
  if(event.target.closest('[data-draft-more]')) {
    draftState.limit += 6; render(); document.querySelector('#draft-search').focus({preventScroll:true}); return;
  }
  const graphPair = event.target.closest('[data-graph-pair]');
  if(graphPair) return openGraphPair(graphPair.dataset.graphPair);
  if(event.target.closest('#graph-reset')) {
    query='';graphState.counter='';graphState.target='';graphState.status='inferred';counterLimit=12;render();document.querySelector('#graph-reset').focus({preventScroll:true});return;
  }
  const jump = event.target.closest('[data-season-jump]');
  if(jump) document.querySelector(jump.dataset.seasonJump === 'method' ? '#season-method' : '#season-board').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});

  const lane = event.target.closest('[data-season-lane]');
  if(lane) { seasonState.lane=lane.dataset.seasonLane; render(); document.querySelector(`[data-season-lane="${CSS.escape(seasonState.lane)}"]`).focus({preventScroll:true}); }
  const spotlight = event.target.closest('[data-spotlight]');
  if(spotlight) { seasonState.spotlight=spotlight.dataset.spotlight; render(); document.querySelector(`[data-spotlight="${CSS.escape(seasonState.spotlight)}"]`).focus({preventScroll:true}); }
  if(event.target.closest('[data-season-reset]')) { query='';seasonState.lane='all';seasonState.className='All';seasonState.trend='all';render();document.querySelector('#search').focus({preventScroll:true}); }
  if(event.target.closest('#counter-more')) { const firstNew=counterLimit;counterLimit+=12;render();document.querySelector(`[data-matchup-index="${firstNew}"]`).focus({preventScroll:true}); }
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
  if(event.target.id === 'draft-search') {
    const position = event.target.selectionStart;
    draftState.search = event.target.value; draftState.limit = 6; render();
    const input = document.querySelector('#draft-search'); input.focus({preventScroll:true}); input.setSelectionRange(position,position); return;
  }
  if(event.target.id!=='search') return;
  const position=event.target.selectionStart;query=event.target.value;counterLimit=12;render();const input=document.querySelector('#search');input.focus();input.setSelectionRange(position,position);
});
main.addEventListener('change',event=>{
  if(event.target.dataset.draftSide) {
    const id = event.target.id;
    draftState[event.target.dataset.draftSide][Number(event.target.dataset.draftSlot)] = event.target.value;
    render(); document.querySelector(`#${id}`).focus({preventScroll:true}); return;
  }
  if(event.target.id === 'draft-ban' && event.target.value) {
    draftState.bans.push(event.target.value); render(); document.querySelector('#draft-ban').focus({preventScroll:true}); return;
  }
  if(event.target.id === 'draft-inferred' || event.target.id === 'draft-role') {
    const id = event.target.id;
    if(id === 'draft-inferred') draftState.includeInferred = event.target.checked;
    else { draftState.role = event.target.value; draftState.limit = 6; }
    render(); document.querySelector(`#${id}`).focus({preventScroll:true}); return;
  }
  if(event.target.id==='counter-mode') {counterMode=event.target.value;counterLimit=12;render();document.querySelector('#counter-mode').focus({preventScroll:true});}
  if(['graph-counter','graph-target','graph-status'].includes(event.target.id)) {const id=event.target.id;graphState[id.slice(6)]=event.target.value;counterLimit=12;render();document.querySelector(`#${id}`).focus({preventScroll:true});}
  if(event.target.id==='catalog-source') {catalogSource=event.target.value;query='';render();document.querySelector('#catalog-source').focus({preventScroll:true});}
  if(event.target.id==='season-class'||event.target.id==='season-trend') { const id=event.target.id;seasonState[id==='season-class'?'className':'trend']=event.target.value;render();document.querySelector(`#${id}`).focus({preventScroll:true}); }
  if(event.target.id==='sort') { sort=event.target.value;render();document.querySelector('#sort').focus({preventScroll:true}); }
  if(event.target.dataset.rank) {
    const slug=event.target.dataset.rank;
    if(event.target.value) rankings[slug]=event.target.value; else delete rankings[slug];
    localStorage.setItem('liqidb-tiers',JSON.stringify(rankings));render();
    document.querySelector(`[data-rank="${CSS.escape(slug)}"]`)?.focus();
  }
});
dialog.addEventListener('click',event=>{
  const graphPair = event.target.closest('[data-graph-pair]');
  if(graphPair) return openGraphPair(graphPair.dataset.graphPair);
  const graphOpen = event.target.closest('[data-graph-open]');
  if(graphOpen) {
    counterMode='graph';graphState.counter=graphOpen.dataset.graphOpen;graphState.target='';graphState.status='all';counterLimit=12;dialog.close();
    if(location.hash===graphOpen.hash) {routeQuery();render();}
  }
  const hero = event.target.closest('[data-hero]');
  if(hero) return openHero(hero.dataset.hero);
  if(event.target.closest('.close-dialog, .close-dialog-inline') || event.target === dialog) dialog.close();
  if(event.target.closest('#confirm-reset')) {rankings={};localStorage.removeItem('liqidb-tiers');dialog.close();render();}
});
dialog.addEventListener('change',event=>{
  if(event.target.id==='build-lane') {
    const slug=event.target.dataset.buildHero;
    dialog.querySelector('.hero-season-context').innerHTML=renderHeroSeason(data,slug,event.target.value);
    dialog.querySelector('#build-lane').focus({preventScroll:true});
  }
});
function routeQuery() {
  const slug = view() === 'counters' ? location.hash.split('/')[1] : '';
  query = data.heroes.find(hero => hero.slug === slug)?.name || '';
}
window.addEventListener('hashchange',()=>{routeQuery();selectedRole='All';counterLimit=12;dialog.close();render(true);window.scrollTo(0,0);});
document.addEventListener('keydown',event=>{
  if(event.key==='/' && !dialog.open && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {event.preventDefault();document.querySelector('#search, #draft-search')?.focus();}
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
