const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => `<ul>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
const heroName = (data, slug) => {
  const hero = data.heroes.find(hero => hero.slug === slug);
  return `${hero.name}${slug.startsWith('flowborn') ? ` · ${hero.classes.join(' / ')}` : ''}`;
};

export function renderCounterScore(data, pair) {
  const score = pair.analysis.score;
  return `<div class="counter-score" data-score="${score ?? 'unrated'}"><strong>${score === null ? 'Chưa chấm' : `${score}/5`}</strong><span>${escape(score === null ? 'Tương tác chưa xác minh' : data.counterGuide.scoreMethod.scale.find(grade => grade.score === score).label)}</span><small>Chứng cứ: ${escape(data.counterGuide.scoreMethod.confidence[pair.analysis.confidence])}</small></div>`;
}

export function renderMatchupAnalysis(data, pair) {
  const analysis = pair.analysis;
  return `<details class="matchup-analysis"><summary>Phân tích cơ chế &amp; chứng cứ</summary>
    <dl><dt>Tình huống</dt><dd>${escape(analysis.scenario)}</dd><dt>Hành động cần đối phó</dt><dd>${escape(analysis.targetAction)}</dd><dt>Cách đáp lại</dt><dd>${escape(analysis.response)}</dd><dt>Vì sao cơ chế có tác dụng?</dt><dd>${escape(analysis.causalLink)}</dd></dl>
    <h4>Điều kiện chuẩn bị</h4>${list(analysis.setup)}<h4>Nhịp thực hiện</h4>${list(analysis.sequence)}<h4>Đối thủ có thể phản ứng thế nào?</h4>${list(analysis.counterplay)}
    <h4>Tài nguyên &amp; đánh đổi</h4><p>${escape(analysis.cost)}</p><h4>Cơ sở chấm điểm</h4><p>${escape(analysis.scoreReason)}</p><p>${escape(analysis.nextGradeLimit)}</p><p class="data-caption">${escape(analysis.versionNote)}</p>
    <h4>Đối chiếu hai bộ kỹ năng</h4><ul class="matchup-evidence">${analysis.evidence.map(evidence => `<li><a href="${escape(evidence.url)}" target="_blank" rel="noreferrer">${escape(heroName(data,evidence.hero))} · ${escape(evidence.section)}${evidence.revisionId ? ` · bản ${evidence.revisionId}` : ''}</a><p>${escape(evidence.fact)}</p></li>`).join('')}</ul></details>`;
}

export function renderScoreMethod(data) {
  const method = data.counterGuide.scoreMethod;
  return `<details class="score-method"><summary>Cách đọc điểm khắc chế 1–5</summary><p>${escape(method.note)}</p><ol>${method.scale.map(grade => `<li><strong>${grade.score}/5 · ${escape(grade.label)}</strong><p>${escape(grade.anchor)}</p></li>`).join('')}</ol><p>${escape(method.versionNote)}</p><a href="${escape(data.counterGuide.balanceUrl)}" target="_blank" rel="noreferrer">Bản cân bằng chính thức 15/10/2026</a></details>`;
}

export function renderHeroMatchups(data, slug) {
  const groups = data.getHeroMatchups(slug);
  const name = heroName(data, slug);
  const renderPair = (pair, incoming) => {
    const opponent = incoming ? pair.counter : pair.target;
    return `<article class="hero-matchup" data-counter="${escape(pair.counter)}" data-target="${escape(pair.target)}"><div class="hero-matchup-heading"><button class="button secondary" data-hero="${escape(opponent)}">${escape(heroName(data,opponent))}</button><span>${incoming ? `→ ${escape(name)}` : `← ${escape(name)}`}</span></div>${renderCounterScore(data,pair)}<p>${escape(pair.reason)}</p><p class="matchup-limit"><strong>Giới hạn:</strong> ${escape(pair.limitation)}</p>${renderMatchupAnalysis(data,pair)}</article>`;
  };
  return `<h2>Cặp khắc chế</h2><p>Điểm cho tình huống đã phân tích, không phải tỷ lệ thắng. Mũi tên đi từ lựa chọn khắc chế đến tướng bị đối phó.</p>${renderScoreMethod(data)}
    <section class="matchup-direction-group" data-direction="incoming"><h3>Ai khắc chế ${escape(name)}?</h3>${groups.incoming.map(pair => renderPair(pair,true)).join('') || '<p>Chưa có phân tích đủ căn cứ theo hướng này.</p>'}</section>
    <section class="matchup-direction-group" data-direction="outgoing"><h3>${escape(name)} khắc chế ai?</h3>${groups.outgoing.map(pair => renderPair(pair,false)).join('') || '<p>Chưa có phân tích đủ căn cứ theo hướng này.</p>'}</section>
    ${groups.unverified.length ? `<details class="unverified-matchups"><summary>Chưa đủ căn cứ · ${groups.unverified.length} giả thuyết</summary><p>Không nằm trong khuyến nghị khắc chế; cần xác minh tương tác trung tâm.</p>${groups.unverified.map(pair => `<article class="hero-matchup"><h4>${escape(heroName(data,pair.counter))} → ${escape(heroName(data,pair.target))}</h4>${renderCounterScore(data,pair)}<p>${escape(pair.analysis.scoreReason)}</p>${renderMatchupAnalysis(data,pair)}</article>`).join('')}</details>` : ''}`;
}
