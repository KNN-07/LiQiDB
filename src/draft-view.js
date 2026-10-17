import { evaluateDraft } from './draft.js';
import { MIN_JOINT_GAMES, HISTORY_PRIOR_GAMES } from './history.js';
import './draft.css';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identity = slug => slug.startsWith('flowborn') ? 'flowborn' : slug;
const name = hero => `${hero.name}${hero.slug.startsWith('flowborn') ? ` · ${hero.classes.join(' / ')}` : ''}`;
const signed = score => score === null ? 'Chưa đủ dữ liệu' : `${score > 0 ? '+' : ''}${score}`;
const portrait = hero => hero.portrait || hero.skins?.[0]?.thumb;
const face = hero => portrait(hero) ? `<img src="${escape(portrait(hero))}" alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer">` : '<span class="draft-placeholder" aria-hidden="true">—</span>';

export const draftState = {
  allies: Array(5).fill(''), enemies: Array(5).fill(''), bans: [],
  includeInferred: true, search: '', role: 'All', limit: 6,
  historyYear: undefined,
};

export function renderDraft(data) {
  const selected = [...draftState.allies, ...draftState.enemies, ...draftState.bans].filter(Boolean);
  const unavailable = new Set(selected.map(identity));
  const heroes = [...data.heroes].sort((a,b) => name(a).localeCompare(name(b),'vi'));
  const bySlug = new Map(heroes.map(hero => [hero.slug, hero]));
  const available = heroes.filter(hero => !unavailable.has(identity(hero.slug)));
  const historyYear = draftState.historyYear ?? data.proHistoryIndex.years[0] ?? 0;
  const heroNames = slugs => slugs.map(slug => name(bySlug.get(slug))).join(' + ');
  const percent = value => `${value.toLocaleString('vi-VN',{maximumFractionDigits:1})}%`;
  const date = value => new Date(value).toLocaleDateString('vi-VN');
  const result = evaluateDraft(data, {
    allies: draftState.allies.filter(Boolean), enemies: draftState.enemies.filter(Boolean), bans: draftState.bans,
  }, {includeInferred: draftState.includeInferred, historyYear});
  const options = current => `<option value="">Chưa chọn</option>${heroes.filter(hero => hero.slug === current || !unavailable.has(identity(hero.slug))).map(hero => `<option value="${escape(hero.slug)}"${hero.slug === current ? ' selected' : ''}>${escape(name(hero))}</option>`).join('')}`;
  const team = (side, label) => {
    const members = draftState[side].filter(Boolean).map(slug => bySlug.get(slug));
    const classes = [...new Set(members.flatMap(hero => hero.classes))];
    return `<section class="draft-team" aria-labelledby="${side}-title"><div class="draft-heading"><h2 id="${side}-title">${label}</h2><span>${members.length}/5 tướng</span></div>
      <div class="draft-slots">${draftState[side].map((slug,i) => `<div class="draft-slot">${slug ? face(bySlug.get(slug)) : `<span class="draft-placeholder" aria-hidden="true">${i+1}</span>`}<label for="draft-${side}-${i}"><span>Vị trí ${i+1}${slug ? ` · ${escape(bySlug.get(slug).classes.join(' / '))}` : ''}</span><select id="draft-${side}-${i}" data-draft-side="${side}" data-draft-slot="${i}">${options(slug)}</select></label></div>`).join('')}</div>
      <p class="draft-classes">Vai trò đã có: ${classes.length ? escape(classes.join(' · ')) : 'Chưa có tướng. Chọn ở các vị trí trên.'}</p></section>`;
  };
  const coverage = summary => `${summary.coverage}/${summary.total} cặp có chứng cứ · ${summary.reviewed} hướng đối chiếu · ${summary.inferred} hướng suy luận`;
  const direction = pair => pair && pair.score !== null && (draftState.includeInferred || pair.status === 'reviewed')
    ? `${pair.score}/5 · ${pair.status === 'reviewed' ? 'đã đối chiếu' : 'suy luận × 0,5'}` : 'Chưa có chứng cứ được dùng';
  const evidence = summary => `<details class="draft-evidence"><summary>Xem từng cặp &amp; phản ứng ngược</summary>${summary.pairs.map(pair => `<div class="draft-pair"><strong>${escape(name(bySlug.get(pair.ally)))} ↔ ${escape(name(bySlug.get(pair.enemy)))}</strong><p>Thuận: ${direction(pair.forward)}<br>Ngược: ${direction(pair.reverse)}</p><button class="button secondary" data-graph-pair="${escape(pair.ally)}:${escape(pair.enemy)}">Xem cơ chế &amp; nguồn</button></div>`).join('')}</details>`;
  const historyEvidence = row => {
    const history = row.history;
    const best = history.joint[0];
    return `<div class="draft-history" data-history-hero="${escape(row.slug)}">
      <strong>Lịch sử thi đấu · ${historyYear || 'tất cả năm'}</strong>
      ${history.games ? `<p>${history.wins}/${history.games} ván thắng (${percent(history.winRate)}) trong dữ liệu đã ghi nhận.</p>` : '<p>Chưa có ván đấu đầy đủ cho tướng này trong phạm vi đã chọn.</p>'}
      ${best ? `<p class="draft-joint"><strong>Đã gặp cùng lúc ${escape(heroNames(best.targets))}</strong><br>${best.wins}/${best.games} ván thắng (${percent(best.winRate)}). ${best.eligible ? 'Có đủ mẫu để phân hạng khi điểm cơ chế bằng nhau.' : `Mẫu dưới ${MIN_JOINT_GAMES} ván; không dùng để phân hạng.`}</p>` : `<p>${row.total >= 2 ? 'Chưa ghi nhận tướng này đối đầu đồng thời hai mục tiêu đang chọn trong cùng một ván.' : 'Chọn ít nhất hai mục tiêu để tìm những ván từng đối đầu cùng lúc.'}</p>`}
      <details><summary>Xem lịch sử, tuyển thủ &amp; ván gốc</summary>
        <p>Chỉ tính ván có đủ 5 lựa chọn mỗi bên và kết quả hợp lệ. Tỷ lệ lịch sử không chứng minh khắc chế; các trận khác phiên bản có thể không còn phù hợp.</p>
        ${history.players.length ? `<p>Tuyển thủ được ghi trực tiếp trong dữ liệu: ${history.players.map(player=>`${escape(player.name)} (${player.wins}/${player.games} ván thắng)`).join('; ')}. Chỉ hiển thị tối đa 3 người có nhiều ván nhất.</p>` : '<p>Không có tên tuyển thủ được ghi trực tiếp trong phạm vi này; không suy đoán từ đội hình đăng ký.</p>'}
        ${history.opponents.length ? `<p>Đối đầu riêng từng mục tiêu: ${history.opponents.map(pair=>`${escape(heroNames([pair.slug]))}: ${pair.wins}/${pair.games} ván thắng`).join('; ')}. Các ván riêng lẻ không được gộp thành bằng chứng gặp cùng lúc.</p>` : ''}
        ${history.joint.map(pair=>`<section class="draft-history-pair" data-joint-targets="${escape(pair.targets.join(':'))}"><h3>${escape(heroNames(pair.targets))}</h3><p>${pair.wins}/${pair.games} ván thắng · ${percent(pair.winRate)}. ${pair.eligible ? `Tỷ lệ đã làm mượt để phân hạng: ${percent(pair.adjustedRate)}.` : 'Mẫu nhỏ; chỉ tham khảo.'}</p><ul>${pair.examples.map(example=>`<li><a href="https://aovdata.vercel.app/match/${encodeURIComponent(example.matchId)}" target="_blank" rel="noreferrer">${escape(example.tournament)} · ${date(example.date)} · ván ${example.number}</a><br>${escape(example.team)} · ${example.won ? 'Thắng' : 'Thua'} · ${example.player ? escape(example.player) : 'Chưa ghi tuyển thủ'}</li>`).join('')}</ul><p>Hiển thị tối đa 3 ván gần nhất; số liệu tính trên toàn bộ ${pair.games} ván phù hợp.</p></section>`).join('')}
      </details></div>`;
  };
  const candidates = (list, kind) => {
    const filtered = list.filter(row => data.filterRecords([bySlug.get(row.slug)], draftState.search, draftState.role).length);
    const full = (kind === 'pick' ? draftState.allies : draftState.enemies).every(Boolean);
    if(full) return `<p class="draft-empty">${kind === 'pick' ? 'Đội bạn' : 'Đội địch'} đã đủ 5 tướng. ${kind === 'pick' ? 'Xóa hoặc thay một vị trí để xem gợi ý chọn.' : 'Không còn lượt chọn của đối thủ để đề xuất cấm.'}</p>`;
    if(!filtered.length) return '<p class="draft-empty">Không có tướng khả dụng phù hợp. Đổi từ khóa hoặc vai trò để xem thêm.</p>';
    return `<ol class="draft-recommendations">${filtered.slice(0,draftState.limit).map(row => {
      const hero = bySlug.get(row.slug);
      return `<li data-draft-candidate="${kind}:${escape(row.slug)}"><div class="draft-candidate-head">${face(hero)}<div><button class="draft-name" data-hero="${escape(hero.slug)}">${escape(name(hero))}</button><p>${escape(hero.classes.join(' / '))}</p></div><strong class="draft-grade">${signed(row.score)}</strong></div>
        <p class="draft-coverage">${coverage(row)}</p>
        <div class="draft-targets"><strong>${kind === 'pick' ? 'Đối phó' : 'Đe dọa'} ${row.countered.length}/${row.total} mục tiêu theo cơ chế</strong><p>${row.countered.length ? escape(heroNames(row.countered)) : 'Chưa có mục tiêu có lợi thế cơ chế dương.'}</p>${row.threats.length ? `<p><strong>Bất lợi trước:</strong> ${escape(heroNames(row.threats))}</p>` : ''}${row.total > row.countered.length + row.threats.length ? '<p>Các mục tiêu còn lại: chưa rõ hoặc chứng cứ hai chiều ngang nhau.</p>' : ''}</div>
        ${row.score === null ? '<p>Chưa thể xếp ưu tiên theo chứng cứ hiện có.</p>' : `<p>${kind === 'pick' ? 'Chỉ số đối đầu với các tướng địch đã chọn.' : 'Mức đe dọa đối với các tướng đội bạn đã chọn.'}${row.score <= 0 ? ' Chưa có lợi thế dương theo dữ liệu này.' : ''}</p>`}
        <div class="draft-actions"><button class="button secondary" data-draft-add="${kind}" data-slug="${escape(hero.slug)}">${kind === 'pick' ? 'Chọn vào đội bạn' : 'Cấm tướng này'}</button></div>${historyEvidence(row)}${row.total ? evidence(row) : ''}</li>`;
    }).join('')}</ol><p class="draft-coverage">Hiện ${Math.min(filtered.length,draftState.limit)}/${filtered.length} tướng khả dụng</p>${filtered.length > draftState.limit ? '<button class="button secondary" data-draft-more>Xem thêm gợi ý</button>' : ''}`;
  };
  return `<section class="draft-advisor" aria-label="Trợ lý cấm chọn">
    <div class="draft-topline"><p>Nhập đội hình đang chọn. Điểm và gợi ý cập nhật ngay sau mỗi thay đổi.</p><button class="button secondary" id="draft-reset"${selected.length ? '' : ' disabled'}>Xóa đội hình</button></div>
    <div class="draft-teams">${team('allies','Đội bạn')}${team('enemies','Đội địch')}</div>
    <section class="draft-bans" aria-labelledby="bans-title"><div><h2 id="bans-title">Tướng đã cấm</h2><p>Cấm chung cho cả hai đội; không áp đặt thứ tự lượt cấm.</p></div><label for="draft-ban"><span>Thêm tướng cấm</span><select id="draft-ban"><option value="">Chọn tướng để cấm</option>${available.map(hero=>`<option value="${escape(hero.slug)}">${escape(name(hero))}</option>`).join('')}</select></label>
      <div class="draft-ban-list">${draftState.bans.map(slug=>`<button class="button secondary" data-draft-unban="${escape(slug)}" aria-label="Bỏ cấm ${escape(name(bySlug.get(slug)))}">${escape(name(bySlug.get(slug)))} · Bỏ cấm</button>`).join('') || '<p>Chưa cấm tướng nào.</p>'}</div></section>
    <section class="draft-scoreboard"><div class="draft-score" role="status" aria-live="polite"><span>Chỉ số đối đầu đội bạn</span><strong id="draft-score">${signed(result.team.score)}</strong><p>${result.team.score === null ? 'Chọn tướng ở cả hai đội để đối chiếu; cặp thiếu chứng cứ vẫn chưa được đánh giá.' : 'Dương: chứng cứ nghiêng về đội bạn. Âm: nghiêng về đội địch. 0 không có nghĩa là cân bằng.'}</p></div><div><p>${coverage(result.team)}</p><p>${result.team.unknown} hướng chưa có chứng cứ.${draftState.includeInferred ? '' : ' Các hướng chỉ có suy luận đang bị loại khỏi phép tính.'} Không phải tỷ lệ thắng.</p><label class="draft-inference"><input id="draft-inferred" type="checkbox"${draftState.includeInferred ? ' checked' : ''}> Dùng cả suy luận cơ chế (trọng số 0,5)</label></div></section>
    <details class="score-method"><summary>Cách tính chỉ số đội hình &amp; giới hạn</summary><p>Chỉ số = 100 × tổng (điểm thuận có trọng số − điểm ngược có trọng số) / (5 × số cặp đối đầu). Hướng đã đối chiếu có trọng số 1, suy luận có trọng số 0,5. Hướng chưa biết không đóng góp điểm; nếu không có chứng cứ, không chấm chỉ số. Thiếu dữ liệu kéo chỉ số về 0, không chứng minh hai đội cân bằng.</p><p>Chọn: đối chiếu ứng viên với đội địch. Cấm: đối chiếu ứng viên địch với đội bạn. Ưu tiên ứng viên có chứng cứ và chỉ số cơ chế không âm, rồi số mục tiêu có lợi thế dương, ít mục tiêu bất lợi hơn, chỉ số cơ chế, lịch sử đối đầu cùng lúc và độ phủ. Số mục tiêu không làm tăng điểm cơ chế 1–5 của từng cặp.</p><p>Lịch sử chỉ phân hạng khi các tiêu chí cơ chế bằng nhau: dùng cặp mục tiêu cùng xuất hiện bên địch trong một ván, tối thiểu ${MIN_JOINT_GAMES} ván. Tỷ lệ làm mượt = (số thắng + ${HISTORY_PRIOR_GAMES / 2}) / (số ván + ${HISTORY_PRIOR_GAMES}); đây là quy tắc tham khảo, không phải dự báo thắng. Không có mẫu đủ lớn dùng mốc 50% để so sánh, không hiển thị như kết quả thực tế.</p><p>Chưa có đội hình liên quan thì danh sách chỉ để chọn tướng. Chưa tính phối hợp đồng đội, vị trí đường, trình độ hay thứ tự cấm chọn. Điểm cơ chế và lịch sử thi đấu là hai nguồn riêng, không biến kết quả trận thành bằng chứng nhân quả. Hai dạng Flowborn được tính là cùng một tướng khi chọn.</p></details>
    ${result.team.total ? `<details class="draft-team-analysis"><summary>Đối chiếu đội hình · ${result.team.total} cặp</summary>${evidence(result.team)}</details>` : ''}
    <aside class="draft-history-source"><strong>Lịch sử pro từ <a href="${escape(data.proHistory.source.url)}" target="_blank" rel="noreferrer">AOVStats</a></strong><p>${data.proHistory.games.length.toLocaleString('vi-VN')} ván có đội hình hợp lệ; ${data.proHistory.excludedGames.length.toLocaleString('vi-VN')} bản ghi ván không dùng vì thiếu hoặc lỗi dữ liệu. Thu thập ${date(data.proHistory.source.retrievedAt)}; phạm vi ${date(data.proHistory.source.dateRange.from)} – ${date(data.proHistory.source.dateRange.to)}.</p><p>Đã đối chiếu danh tính ${data.proHistory.source.counts.mappedHeroes}/${data.heroes.length} tướng trong cẩm nang. Không ghép tướng khi tên hoặc danh tính chưa xác minh.</p><p>Mẫu ghi nhận của nguồn, không phải toàn bộ lịch sử thi đấu chuyên nghiệp. Năm cũ có thể khác bộ kỹ năng hiện tại. Tên tuyển thủ chỉ dùng khi nguồn gắn trực tiếp với lượt chọn.</p></aside>
    <div class="draft-filters"><label class="search"><span>Tìm trong gợi ý</span><div class="search-field"><input id="draft-search" type="search" value="${escape(draftState.search)}" placeholder="Tên hoặc vai trò tướng..." autocomplete="off"></div></label><label class="sort"><span>Vai trò cần chọn / cấm</span><select id="draft-role">${['All','Đấu sĩ','Sát thủ','Pháp sư','Xạ thủ','Đỡ đòn','Trợ thủ'].map(role=>`<option value="${role}"${draftState.role === role ? ' selected' : ''}>${role === 'All' ? 'Tất cả vai trò' : role}</option>`).join('')}</select></label><label class="sort"><span>Năm thi đấu</span><select id="draft-year"><option value="0"${historyYear === 0 ? ' selected' : ''}>Tất cả lịch sử</option>${data.proHistoryIndex.years.map(year=>`<option value="${year}"${historyYear === year ? ' selected' : ''}>${year}</option>`).join('')}</select></label></div>
    <div class="draft-suggestions"><section aria-labelledby="pick-title"><h2 id="pick-title">Gợi ý chọn</h2><p>Một lựa chọn · đối phó nhiều mục tiêu</p>${candidates(result.picks,'pick')}</section><section aria-labelledby="ban-title"><h2 id="ban-title">Gợi ý cấm</h2><p>Loại tướng đe dọa nhiều thành viên đội bạn</p>${candidates(result.bans,'ban')}</section></div>
  </section>`;
}
