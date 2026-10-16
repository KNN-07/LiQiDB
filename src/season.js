import { glyph } from './icons.js';
import './season.css';

const escape = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const laneKeys = ['top', 'jg', 'mid', 'ad', 'sp'];
const tiers = ['S', 'A', 'B', 'C', 'D'];
const laneIcons = { top: 'fighter', jg: 'counter', mid: 'mage', ad: 'arrow', sp: 'support' };
const trends = { up: 'Tăng sức mạnh', down: 'Giảm sức mạnh', mix: 'Điều chỉnh', new: 'Làm lại' };
const date = value => {
  const parts = String(value || '').slice(0, 10).split('-');
  return parts.length === 3 ? escape(parts.reverse().join('/')) : escape(value);
};
const score = value => Number.isFinite(value) ? value.toLocaleString('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : 'Chưa có điểm';
const safeUrl = value => /^(https?:\/\/|\/(?!\/))/.test(String(value || '')) ? escape(value) : '';
const image = (url, alt, width = 160, height = 160, className = '') => safeUrl(url)
  ? `<img class="${className}" src="${safeUrl(url)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
  : `<span class="season-image-fallback" aria-hidden="true">${escape(String(alt).slice(0, 1))}</span>`;
const sourceLink = (url, label) => safeUrl(url) ? `<a href="${safeUrl(url)}" target="_blank" rel="noreferrer">${escape(label)} ${glyph('external')}</a>` : escape(label);
const heroName = hero => hero.slug === 'flowborn-2' ? `${hero.name} · Pháp sư` : hero.slug === 'flowborn' ? `${hero.name} · Xạ thủ` : hero.name;
const markers = record => `${record.secondary ? '<span class="season-marker">Phụ</span>' : ''}${record.manual ? '<span class="season-marker">Chỉnh tay</span>' : ''}`;
const option = (value, label, selected) => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`;

function tile(hero, record) {
  return `<button class="season-tile" data-hero="${escape(hero.slug)}" aria-label="${escape(`${heroName(hero)}, ${record.tier}, điểm ${score(record.score)}${record.secondary ? ', đường phụ' : ''}${record.manual ? ', chỉnh tay' : ''}. Xem chi tiết`)}">
    <span class="season-tile-art">${image(hero.portrait || hero.skins?.[0]?.thumb, '', 160, 160)}<span class="season-tile-markers">${markers(record)}</span></span>
    <span class="season-tile-name">${escape(heroName(hero))}</span><span class="season-tile-score">${score(record.score)} <span>/ 5</span></span>
  </button>`;
}

function spotlight(data, lane, heroes) {
  const meta = data.seasonMeta;
  const record = meta.records.filter(entry => entry.lane === lane && heroes.has(entry.slug))
    .sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier) || a.rank - b.rank)[0];
  if (!record) return '';
  const hero = heroes.get(record.slug);
  return `<section class="season-spotlight" data-spotlight-hero="${escape(hero.slug)}" aria-labelledby="season-spotlight-title">
    ${image(hero.skins?.[0]?.splash || hero.portrait, `Hình ảnh ${heroName(hero)}`, 1440, 700, 'season-spotlight-art')}
    <div class="season-spotlight-scrim"></div>
    <div class="season-spotlight-top"><p class="season-kicker">Tâm điểm từng đường</p><span>Mẫu ${date(meta.source.dataDate)} · trước cân bằng</span></div>
    <div class="season-spotlight-copy"><p class="season-kicker">${escape(meta.lanes[lane])} · Hạng nguồn ${escape(record.rank)}</p>
      <h2 id="season-spotlight-title">${escape(heroName(hero))}</h2><p>${escape(hero.title)}</p>
      <div class="season-spotlight-score"><span class="season-tier-letter" data-tier="${escape(record.tier)}">${escape(record.tier)}</span><div><strong>${score(record.score)} <small>/ 5</small></strong><span>Điểm tổng hợp cộng đồng</span></div>${markers(record)}</div>
      <div class="season-actions"><button class="season-button" data-hero="${escape(hero.slug)}">Khám phá tướng ${glyph('arrow')}</button><a class="season-text-link" href="#counters/${escape(hero.slug)}">Xem khắc chế ${glyph('counter')}</a></div>
    </div>
    <div class="season-spotlight-lanes" role="group" aria-label="Chọn đường tâm điểm">${laneKeys.map(key => `<button data-spotlight="${key}" aria-pressed="${key === lane}">${glyph(laneIcons[key])}<span>${escape(meta.lanes[key])}</span></button>`).join('')}</div>
  </section>`;
}

function provenance(data, heroes) {
  const { source, method, balance, seasonSource, seasonStartsAt } = data.seasonMeta;
  return `<section class="season-provenance" id="season-method" aria-labelledby="season-method-title">
    <div class="season-section-heading"><div><p class="season-kicker">Đọc dữ liệu đúng ngữ cảnh</p><h2 id="season-method-title">Cách xếp &amp; nguồn</h2></div>${glyph('info')}</div>
    <div class="season-method-grid"><div><h3>Một lát cắt, không phải lời tiên đoán</h3><p>${escape(method.note)}</p>
      <p>Đường phụ bị trừ ${escape(method.secondaryPenalty)} điểm khi so thứ hạng và tối đa tier ${escape(method.secondaryMaxTier)}. Nhãn “Chỉnh tay” giữ nguyên quyết định của biên tập viên; điểm và tier có thể không cùng thứ tự. Không phải tỷ lệ thắng rank, bảng chính thức hay xếp hạng toàn cầu.</p>
      <p>Flowborn Xạ thủ và Flowborn Pháp sư là hai bản ghi riêng. Evita chưa được nguồn xếp tier.</p></div>
      <dl class="season-source-facts"><div><dt>Mùa bắt đầu</dt><dd>${date(seasonStartsAt)} · ${sourceLink(seasonSource, 'Garena')}</dd></div>
      <div><dt>Mẫu giải Việt Nam</dt><dd>${escape(method.aogGames)} trận · đến ${date(method.aogCutoff)}</dd></div><div><dt>Mẫu mùa trước</dt><dd>${escape(method.previousGames)} trận</dd></div>
      <div><dt>Mẫu cộng đồng</dt><dd>${date(method.communityDate)}</dd></div><div><dt>Chụp nguồn</dt><dd>${date(source.capturedAt)}</dd></div>
      <div><dt>Nguồn tổng hợp</dt><dd>${sourceLink(source.url, source.name)} · ${sourceLink(source.repository, 'Kho mã nguồn')}</dd></div>
      <div><dt>Phiên bản nguồn</dt><dd><code>${escape(source.commit)}</code></dd></div></dl></div>
    <div class="season-balance-heading"><p class="season-kicker">Cân bằng chính thức · ${date(balance.date)}</p><h3>8 thay đổi cần đọc trước khi chọn</h3><p>Diễn giải theo bản mới, không tự nâng hoặc hạ tier của mẫu ${date(source.dataDate)}. ${sourceLink(balance.url, 'Đọc bản cập nhật Garena')}</p></div>
    <div class="season-balance-grid">${balance.updates.map(update => `<article><h4>${update.slugs.map(slug => {
      const hero = heroes.get(slug);
      return `<button data-hero="${escape(slug)}">${escape(hero ? heroName(hero) : slug)} ${glyph('arrow')}</button>`;
    }).join(' · ')}</h4><p>${escape(update.summary)}</p><p class="season-implication">${escape(update.implication)}</p></article>`).join('')}</div>
  </section>`;
}

export function renderSeason(data, query = '', state = {}) {
  const meta = data.seasonMeta;
  const heroes = new Map(data.heroes.map(hero => [hero.slug, hero]));
  const lane = laneKeys.includes(state.lane) ? state.lane : 'all';
  const spotlightLane = laneKeys.includes(state.spotlight) ? state.spotlight : 'top';
  const className = state.className || 'All';
  const trend = state.trend || 'all';
  const term = data.normalize(query);
  const records = meta.records.filter(record => {
    const hero = heroes.get(record.slug);
    return hero && (lane === 'all' || record.lane === lane)
      && (className === 'All' || hero.classes?.includes(className))
      && (trend === 'all' || record.baselinePatchTrend === trend)
      && (!term || data.normalize(`${hero.name} ${hero.title || ''} ${hero.searchKey || ''} ${heroName(hero)}`).includes(term));
  });
  const mobileLane = lane === 'all' ? laneKeys.find(key => records.some(record => record.lane === key)) || 'top' : lane;
  const classes = [...new Set(data.heroes.flatMap(hero => hero.classes || []))].sort((a, b) => a.localeCompare(b, 'vi'));
  const unique = new Set(meta.records.map(record => record.slug)).size;
  return `<div class="season-page">
    <section class="season-intro" aria-labelledby="season-title"><div class="season-cosmos" aria-hidden="true"></div><div class="season-intro-inner">
      <p class="season-kicker">Mùa ${escape(meta.season)} · Liên Quân Mobile</p><h1 id="season-title">Meta Liên Quân<span>Trong chuyển động</span></h1>
      <p class="season-intro-description">${escape(meta.seasonName)}. Đọc sức mạnh từng đường, hiểu dữ liệu đằng sau mỗi lựa chọn.</p>
      <p class="season-dates">Mẫu nguồn <strong>${date(meta.source.dataDate)}</strong><span aria-hidden="true"> / </span>Cân bằng chính thức <strong>${date(meta.balance.date)}</strong></p>
      <div class="season-actions"><button class="season-button" data-season-jump="board">Khám phá bảng tier ${glyph('arrow')}</button><a class="season-button season-button-quiet" href="#tier-list">Tự xếp bảng của bạn ${glyph('fighter')}</a></div>
      <p class="season-snapshot-note">Tier giữ nguyên mẫu trước cân bằng ${date(meta.balance.date)}. Chưa có mẫu sau cập nhật.</p>
    </div><dl class="season-stats"><div><dt>Bản ghi theo đường</dt><dd>${meta.records.length}</dd></div><div><dt>Tướng / dạng được xếp</dt><dd>${unique}</dd></div><div><dt>Trận ĐTDV trong mẫu</dt><dd>${escape(meta.method.aogGames)}</dd></div><div><dt>Đường thi đấu</dt><dd>05</dd></div></dl></section>
    <div class="season-content">${spotlight(data, spotlightLane, heroes)}
    <section class="season-board-section" id="season-board" aria-labelledby="season-board-title">
      <div class="season-section-heading"><div><p class="season-kicker">Toàn cảnh mùa giải</p><h2 id="season-board-title">Bảng tier theo đường</h2></div><button class="season-text-link" data-season-jump="method">Cách đọc bảng ${glyph('info')}</button></div>
      <p class="season-board-description">So sánh trong cùng một đường. Bấm vào tướng để xem tier, điểm nguồn và build theo đường.</p>
      <div class="season-toolbar"><label class="season-search" for="search"><span>Tìm tướng</span><span class="season-search-field">${glyph('search')}<input type="search" id="search" value="${escape(query)}" placeholder="Tên tướng hoặc danh hiệu" autocomplete="off"></span></label>
      <label for="season-class"><span>Lớp tướng</span><select id="season-class">${option('All', 'Tất cả lớp', className)}${classes.map(value => option(value, value, className)).join('')}</select></label>
      <label for="season-trend"><span>Xu hướng bản 29/09 (nguồn)</span><select id="season-trend">${option('all', 'Tất cả xu hướng', trend)}${Object.entries(trends).map(([value, label]) => option(value, label, trend)).join('')}</select></label>
      <button class="season-reset" data-season-reset>Xóa bộ lọc</button></div>
      <div class="season-lane-selectors" role="group" aria-label="Lọc đường thi đấu"><button class="season-all-lanes" data-season-lane="all" aria-pressed="${lane === 'all'}">Tất cả đường</button>${laneKeys.map(key => `<button class="${key === mobileLane ? 'is-mobile-selected' : ''}" data-season-lane="${key}" aria-pressed="${lane === key}"${lane === 'all' && key === mobileLane ? ` aria-label="${escape(meta.lanes[key])} · hiển thị mặc định trên điện thoại"` : ''}>${glyph(laneIcons[key])}<span>${escape(meta.lanes[key])}</span></button>`).join('')}</div>
      <div class="season-board-meta"><p aria-live="polite">${records.length} bản ghi phù hợp <span class="season-mobile-context">· ${escape(meta.lanes[mobileLane])} trên điện thoại</span></p><p>Điểm / 5 · Phụ = đường phụ · Chỉnh tay = biên tập</p></div>
      ${records.length ? `<div class="season-matrix${lane !== 'all' ? ' season-matrix-single' : ''}" aria-label="Bảng tier S đến D">
        <div class="season-matrix-header"><span class="season-rank-heading">Tier</span>${laneKeys.map(key => `<h3 class="season-lane-cell${key === mobileLane ? ' is-mobile-active' : ''}${lane !== 'all' && lane !== key ? ' is-lane-hidden' : ''}">${glyph(laneIcons[key])}${escape(meta.lanes[key])}</h3>`).join('')}</div>
        ${tiers.map(tier => `<div class="season-matrix-row"><div class="season-rank" data-tier="${tier}"><strong>${tier}</strong><span>${escape(meta.tierNames[tier])}</span></div>${laneKeys.map(key => `<div class="season-lane-cell season-tier-cell${key === mobileLane ? ' is-mobile-active' : ''}${lane !== 'all' && lane !== key ? ' is-lane-hidden' : ''}" aria-label="${escape(`${meta.lanes[key]} · ${tier} · ${meta.tierNames[tier]}`)}">${records.filter(record => record.lane === key && record.tier === tier).sort((a, b) => a.rank - b.rank).map(record => tile(heroes.get(record.slug), record)).join('') || '<span class="season-no-entry">Không có tướng</span>'}</div>`).join('')}</div>`).join('')}</div>`
      : '<div class="season-empty"><h3>Chưa tìm thấy tướng phù hợp</h3><p>Thử tên khác, lớp khác hoặc xóa bộ lọc.</p><button class="season-button" data-season-reset>Xóa bộ lọc</button></div>'}
      <aside class="season-unranked">${glyph('info')}<p><strong>Evita chưa được nguồn xếp tier.</strong> Không tự suy đoán bậc từ bản cập nhật hoặc từ tướng khác.</p>${heroes.has('evita') ? '<button class="season-text-link" data-hero="evita">Xem Evita</button>' : ''}</aside>
    </section>${provenance(data, heroes)}</div></div>`;
}

function buildGroup(label, entries, counted = false) {
  return `<div class="season-build-group"><h4>${label}</h4>${entries.length ? `<ul>${entries.map(entry => `<li>${image(entry.icon, '', 64, 64)}<span>${escape(entry.name)}${counted ? `<strong>× ${escape(entry.count)}</strong>` : ''}</span></li>`).join('')}</ul>` : '<p>Nguồn chưa cung cấp.</p>'}</div>`;
}

export function renderHeroSeason(data, slug, buildLane = '') {
  const meta = data.seasonMeta;
  const records = meta.records.filter(record => record.slug === slug);
  const builds = data.referenceBuilds.records.filter(record => record.slug === slug);
  const build = builds.find(record => record.lane === buildLane) || builds.find(record => record.lane === records.find(entry => !entry.secondary)?.lane) || builds[0];
  const updates = meta.balance.updates.filter(update => update.slugs.includes(slug));
  return `<section class="season-hero-detail" aria-labelledby="season-hero-tier-title"><p class="season-kicker">Mẫu cộng đồng · ${date(meta.source.dataDate)}</p><h3 id="season-hero-tier-title">Vị trí trong mùa giải</h3>
    <p class="season-detail-warning">Tier trước cân bằng ${date(meta.balance.date)}; không phải đánh giá lại sau cập nhật hoặc tỷ lệ thắng rank.</p>
    ${records.length ? `<ul class="season-detail-tiers">${records.map(record => `<li><span class="season-tier-letter" data-tier="${escape(record.tier)}">${escape(record.tier)}</span><div><strong>${escape(meta.lanes[record.lane])} · ${escape(meta.tierNames[record.tier])}</strong><span>${score(record.score)} / 5 · Hạng nguồn ${escape(record.rank)}</span><span class="season-detail-markers">${markers(record)}</span></div></li>`).join('')}</ul>` : `<p>${slug === 'evita' ? 'Evita chưa được nguồn xếp tier.' : 'Tướng này chưa có bản ghi tier trong mẫu nguồn.'}</p>`}
    ${updates.map(update => `<aside class="season-detail-patch"><strong>Cân bằng chính thức ${date(meta.balance.date)}</strong><p>${escape(update.summary)}</p><p>${escape(update.implication)}</p><p>Dữ liệu kỹ năng từ CMS có thể cập nhật chậm hơn bản cân bằng chính thức.${slug === 'dirak' ? ' Riêng Dirak: Pháo tử quang là chiêu 4 độc lập theo bản S4 chính thức; dữ liệu CMS cũ chỉ có bốn ô gồm nội tại và ba chiêu, chưa có ô riêng cho pháo. Không coi mô tả bốn ô cũ là bộ kỹ năng hoàn toàn hiện hành.' : ''}</p></aside>`).join('')}
    <div class="season-build-heading"><div><p class="season-kicker">Build tham khảo · không phải khuyến nghị cố định</p><h3>Trang bị theo đường</h3></div>${builds.length ? `<label for="build-lane"><span>Đường của build</span><select id="build-lane" data-build-hero="${escape(slug)}">${builds.map(record => option(record.lane, meta.lanes[record.lane], build.lane)).join('')}</select></label>` : ''}</div>
    ${build ? `<div class="season-build">${buildGroup('Trang bị · theo thứ tự nguồn', build.items)}${buildGroup('Ngọc', build.arcana, true)}${buildGroup('Phép bổ trợ', build.spells)}</div><p class="season-build-source">Nguồn gốc build: ${sourceLink(build.sourceUrl, 'Mở hướng dẫn gốc')} · Nhập nguồn ngày ${date(data.referenceBuilds.source.capturedAt)}; nguồn không ghi ngày kiểm chứng riêng cho build. Điều chỉnh theo đội hình và phiên bản đang chơi.</p>` : '<p>Chưa có build theo đường trong nguồn tham khảo.</p>'}
    <p class="season-detail-source">${sourceLink(meta.source.url, 'Nguồn tier cộng đồng')} · ${sourceLink(meta.balance.url, 'Bản cân bằng chính thức')}</p></section>`;
}
