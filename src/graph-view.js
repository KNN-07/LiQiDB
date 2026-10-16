import { graphPair, graphHeroPairs } from './graph.js';
import { renderMatchupAnalysis } from './matchups.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name = (data, slug) => {
  const hero = data.heroes.find(hero => hero.slug === slug);
  return `${hero.name}${slug.startsWith('flowborn') ? ` · ${hero.classes.join(' / ')}` : ''}`;
};
const statusName = {reviewed:'Đã đối chiếu từng cặp',inferred:'Ứng viên suy luận tự động',unknown:'Chưa có căn cứ theo hướng này'};
const sourceName = {available:'Có bảng kỹ năng từ wiki',partial:'Bảng kỹ năng chưa đầy đủ',empty:'Trang wiki chưa có bảng kỹ năng',missing:'Chưa có trang wiki phù hợp',stale:'Nguồn đã đổi, cần đối chiếu lại'};
const list = values => `<ul>${values.map(value=>`<li>${escape(value)}</li>`).join('')}</ul>`;
const actionName = {'heal-self':'tự hồi máu',lifesteal:'hút máu','physical-damage':'sát thương vật lý','magic-damage':'sát thương phép','true-damage':'sát thương chuẩn','cc-stun':'choáng','cc-root':'chôn chân','cc-slow':'làm chậm','cc-silence':'câm lặng',stealth:'tàng hình'};
const matchedActions = (data,edge) => [...new Set(edge.targetFacts.map(index=>data.matchupGraph.facts[index].tag))].map(tag=>actionName[tag]).join(', ');

export function renderGraphCard(data, pair, index) {
  return `<article class="matchup-card graph-card" data-matchup-index="${index}" data-graph-counter="${escape(pair.counter)}" data-graph-target="${escape(pair.target)}" tabindex="-1">
    <div class="graph-pair-heading"><button class="button secondary" data-hero="${escape(pair.counter)}">${escape(name(data,pair.counter))}</button><span aria-label="đối phó">→</span><button class="button secondary" data-hero="${escape(pair.target)}">${escape(name(data,pair.target))}</button></div>
    <p class="graph-status">${statusName[pair.status]}</p><p class="graph-grade"><strong>${pair.score === null ? 'Chưa chấm' : `${pair.score}/5`}</strong> ${pair.status === 'inferred' ? 'mức tương tác có điều kiện · chứng cứ thấp' : pair.status === 'unknown' ? 'không đồng nghĩa cân bằng' : 'điểm biên tập riêng cho cặp'}</p>
    <p>${pair.support.length ? pair.support.slice(0,2).map(edge=>`${escape(data.mechanicsRules.rules.find(rule=>rule.id===edge.rule).label)} (${escape(matchedActions(data,edge))})`).join(' · ') : pair.reviewed ? escape(pair.reviewed.reason) : 'Chưa tìm thấy quy tắc có chứng cứ phù hợp; không tự suy ra trung tính.'}</p>
    <p class="data-caption">${pair.opposition.length ? 'Có tương tác ngược: cần xem cả hai chiều.' : 'Không tìm thấy tương tác ngược không có nghĩa đối thủ không có cách phản ứng.'}</p>
    <button class="button secondary" data-graph-pair="${escape(pair.counter)}:${escape(pair.target)}">Xem đường suy luận</button></article>`;
}

export function renderGraphBrowser(data, query, state, limit, toolbar, sort) {
  const options = selected => `<option value="">Tất cả tướng</option>${[...data.heroes].sort((a,b)=>name(data,a.slug).localeCompare(name(data,b.slug),'vi')).map(hero=>`<option value="${escape(hero.slug)}"${selected===hero.slug?' selected':''}>${escape(name(data,hero.slug))}</option>`).join('')}`;
  const search = data.normalize(query);
  const pairs = data.matchupGraph.pairs.filter(row => {
    const counter = data.matchupGraph.slugs[row[0]], target = data.matchupGraph.slugs[row[1]];
    const status = row[2] !== -1 ? 'reviewed' : row[3].length ? 'inferred' : 'unknown';
    return (!state.counter || state.counter===counter) && (!state.target || state.target===target) &&
      (state.status==='all' || state.status===status) &&
      (!search || data.normalize(`${name(data,counter)} ${name(data,target)}`).includes(search));
  }).map(row=>graphPair(data,data.matchupGraph.slugs[row[0]],data.matchupGraph.slugs[row[1]]))
    .sort((a,b) => {
      const compare = `${name(data,a.counter)}:${name(data,a.target)}`.localeCompare(`${name(data,b.counter)}:${name(data,b.target)}`,'vi');
      return sort==='reverse' ? -compare : compare;
    });
  const summary = data.matchupGraph.summary;
  return `<section class="graph-browser"><div class="graph-overview"><h2>Đồ thị cơ chế</h2><p>${summary.pairs.toLocaleString('vi-VN')} hướng đối đầu · ${summary.reviewed} đã đối chiếu · ${summary.inferred.toLocaleString('vi-VN')} ứng viên tự động · ${summary.unknown.toLocaleString('vi-VN')} chưa có căn cứ.</p><p>${escape(data.mechanicsRules.method)}</p><details class="score-method"><summary>Phương pháp, điểm &amp; giới hạn</summary><p>${escape(data.mechanicsRules.scoreMethod)}</p><p>Hai chiều có thể cùng có tương tác. Chưa có thử nghiệm máy khách hoặc tỷ lệ thắng. Ngày sửa wiki không bảo đảm bộ kỹ năng mới nhất; nguồn thay đổi sẽ ngừng sinh cạnh cho tướng bị ảnh hưởng.</p><p>Nội dung wiki được ghi công ở từng chứng cứ theo <a href="https://www.fandom.com/licensing" target="_blank" rel="noreferrer">CC-BY-SA</a>.</p></details></div>
    <div class="graph-filters"><label class="sort"><span>Tướng đáp lại</span><select id="graph-counter">${options(state.counter)}</select></label><label class="sort"><span>Tướng đối phương</span><select id="graph-target">${options(state.target)}</select></label><label class="sort"><span>Trạng thái chứng cứ</span><select id="graph-status">${[['inferred','Ứng viên tự động'],['reviewed','Đã đối chiếu'],['unknown','Chưa có căn cứ'],['all','Tất cả hướng']].map(([value,label])=>`<option value="${value}"${state.status===value?' selected':''}>${label}</option>`).join('')}</select></label></div>
    <button class="button secondary" id="graph-reset">Xóa bộ lọc đồ thị</button>${toolbar('hướng đối đầu',pairs.length)}
    <div class="matchup-grid">${pairs.slice(0,limit).map((pair,index)=>renderGraphCard(data,pair,index)).join('') || '<p class="graph-empty">Không có hướng phù hợp bộ lọc. Chọn “Tất cả hướng” hoặc xóa bộ lọc để xem cả các trường hợp chưa có căn cứ.</p>'}</div>
    <div class="counter-more"><p class="data-caption" role="status">Đang hiển thị ${Math.min(limit,pairs.length)} / ${pairs.length} hướng</p>${pairs.length>limit?'<button class="button secondary" id="counter-more">Xem thêm 12 hướng</button>':''}</div></section>`;
}

export function renderGraphDetail(data, counter, target) {
  const pair = graphPair(data,counter,target);
  const evidence = index => {
    const fact = data.matchupGraph.facts[index];
    const source = data.heroWiki.records.find(record=>record.slug===fact.hero).source;
    return `<li><strong>${escape(name(data,fact.hero))} · ${escape(fact.ability)}</strong><blockquote>${escape(fact.quote)}</blockquote>${fact.clarification?`<p><strong>Giải thích bổ sung từ wiki:</strong> ${escape(fact.clarification.quote)} (${escape(fact.clarification.section.replaceAll('_',' '))})</p>`:''}${list(fact.conditions)}${list(fact.limitations)}<a href="${escape(source.revisionUrl)}" target="_blank" rel="noreferrer">Wiki · bản ${source.revisionId} · ${escape(fact.section.replaceAll('_',' '))}</a></li>`;
  };
  const paths = edges => edges.map(edge=>{
    const rule = data.mechanicsRules.rules.find(rule=>rule.id===edge.rule);
    return `<article class="graph-path"><h3>${escape(rule.label)}</h3><p><strong>Chỉ đối chiếu:</strong> ${escape(matchedActions(data,edge))}.</p><p>${escape(rule.explanation)}</p><p><strong>Bối cảnh:</strong> ${escape(rule.scope)}</p><details class="source-disclosure"><summary>Kỹ năng đáp lại → quy tắc → hành động đối phương</summary><h4>Kỹ năng đáp lại</h4><ul class="graph-evidence">${edge.responseFacts.map(evidence).join('')}</ul><h4>Hành động đối phương</h4><ul class="graph-evidence">${edge.targetFacts.map(evidence).join('')}</ul></details><h4>Điều kiện</h4>${list(rule.conditions)}<h4>Cách phản ứng</h4>${list(rule.counterplay)}<h4>Đánh đổi</h4><p>${escape(rule.cost)}</p><h4>Không suy ra</h4>${list(rule.exclusions)}<p class="data-caption">${escape(rule.ceiling)}</p></article>`;
  }).join('');
  const held = data.counterGuide.unverifiedCandidates.find(candidate=>candidate.counter===counter&&candidate.target===target);
  return `<p class="eyebrow">ĐỒ THỊ CƠ CHẾ</p><h1 id="detail-title">${escape(name(data,counter))} → ${escape(name(data,target))}</h1><p class="graph-status">${statusName[pair.status]}</p><p class="graph-grade"><strong>${pair.score===null?'Chưa chấm':`${pair.score}/5`}</strong> ${pair.status==='inferred'?'mức tương tác suy luận, không phải sức mạnh tổng thể của cặp':''}</p><p>${escape(data.mechanicsRules.scoreMethod)}</p>
    <p>${escape(name(data,counter))}: ${sourceName[pair.sourceStates[0]]}. ${escape(name(data,target))}: ${sourceName[pair.sourceStates[1]]}.</p>
    ${held?`<aside class="matchup-notice"><div><strong>Giả thuyết cũ vẫn chưa được xác minh</strong><p>${escape(held.analysis.scoreReason)}</p><p>Cạnh khác trong đồ thị không xác nhận tương tác đang thiếu chứng cứ này.</p></div></aside>`:''}
    ${pair.reviewed?`<section><h2>Phân tích đã đối chiếu riêng</h2><p>${escape(pair.reviewed.reason)}</p>${renderMatchupAnalysis(data,pair.reviewed)}</section>`:''}
    <section data-graph-support><h2>Tương tác hỗ trợ hướng này</h2>${paths(pair.support)||'<p>Chưa tìm thấy đường suy luận có chứng cứ trong các quy tắc hiện tại. Không kết luận hai tướng cân bằng.</p>'}</section>
    <section data-graph-opposition><h2>Tương tác ngược cần tính đến</h2>${paths(pair.opposition)||'<p>Chưa tìm thấy trong bộ quy tắc; không có nghĩa đối phương không có cách chống trả.</p>'}</section>
    <p class="data-caption">Đây là suy luận từ mô tả nguồn, chưa kiểm nghiệm máy khách. Miễn sát thương, miễn khống chế, không thể bị chọn và áp chế được giữ riêng. Ghi công wiki: <a href="https://www.fandom.com/licensing" target="_blank" rel="noreferrer">CC-BY-SA</a>.</p>`;
}

export function renderHeroGraph(data, slug) {
  const group = direction => {
    const pairs = graphHeroPairs(data,slug,direction).filter(pair=>pair.status==='inferred');
    const compact = pair => `<li><button class="button secondary" data-graph-pair="${escape(pair.counter)}:${escape(pair.target)}">${escape(name(data,pair.counter))} → ${escape(name(data,pair.target))}</button><span>${pair.score}/5 · suy luận${pair.opposition.length?' · có tương tác ngược':''}</span></li>`;
    return `<section data-graph-direction="${direction}"><h4>${direction==='incoming'?'Ứng viên có thể đối phó tướng này':'Ứng viên tướng này có thể đối phó'}</h4><ul class="graph-compact">${pairs.slice(0,6).map(compact).join('')||'<li>Chưa tìm thấy ứng viên theo hướng này.</li>'}</ul>${pairs.length>6?`<details class="source-disclosure"><summary>Xem thêm ${pairs.length-6} ứng viên</summary><ul class="graph-compact">${pairs.slice(6).map(compact).join('')}</ul></details>`:''}</section>`;
  };
  return `<details class="hero-graph source-disclosure"><summary>Khám phá thêm từ đồ thị cơ chế</summary><p>Ứng viên tự động, tách khỏi các khuyến nghị đã đối chiếu ở trên. Một tương tác không đủ xác nhận khắc chế toàn bộ tướng; cần xem cả chiều ngược và điều kiện.</p>${group('incoming')}${group('outgoing')}<a class="button secondary" data-graph-open="${escape(slug)}" href="#counters/${escape(slug)}">Tra mọi đối thủ trong đồ thị</a></details>`;
}
