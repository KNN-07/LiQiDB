import { glyph } from './icons.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const date = value => new Date(value).toLocaleDateString('vi-VN');

export function renderHeroWiki(data, slug) {
  const record = data.heroWiki.records.find(record => record.slug === slug);
  if (record.status !== 'available') {
    return `<section class="detail-section wiki-details"><h2>Chi tiết từ wiki</h2><p>${record.status === 'missing' ? 'Chưa tìm thấy trang phù hợp trong wiki tiếng Việt. Không tự ghép thông tin từ tướng khác hoặc từ bản quốc tế.' : 'Trang wiki chưa có phần thông tin bổ sung phù hợp để nhập.'} Dữ liệu Garena và ghi chú cân bằng vẫn được giữ bên dưới.</p></section>`;
  }
  return `<section class="detail-section wiki-details" aria-labelledby="wiki-details-title">
    <p class="eyebrow">Wiki cộng đồng · tiếng Việt</p><h2 id="wiki-details-title">Chi tiết từ wiki</h2>
    <p class="wiki-provenance">Sửa trang ${date(record.source.editedAt)} · Nhập ${date(record.source.fetchedAt)} · Phiên bản ${record.source.revisionId}</p>
    <p>${escape(data.heroWiki.note)}</p>
    <p class="wiki-source-links"><a href="${escape(record.source.url)}" target="_blank" rel="noreferrer">Trang wiki ${glyph('external')}</a><a href="${escape(record.source.revisionUrl)}" target="_blank" rel="noreferrer">Bản đã đối chiếu ${glyph('external')}</a></p>
    ${record.sections.map(section => `<details class="source-disclosure"${/kỹ năng/i.test(section.title) ? ' open' : ''}><summary>${escape(section.title)}</summary>
      ${/tương tác/i.test(section.title) ? '<p class="wiki-provenance">Đây là quan hệ trong cốt truyện, không phải cặp khắc chế trong trận đấu.</p>' : ''}
      ${section.blocks.map(block => {
        if (block.kind === 'paragraph') return `<p class="wiki-text">${escape(block.text)}</p>`;
        if (block.kind === 'bullet') return `<ul class="wiki-list"><li>${escape(block.text)}</li></ul>`;
        const hasHeader = block.rows[0].every(cell => cell.header);
        const headings = hasHeader ? block.rows[0].map(cell => cell.text) : [];
        const rows = hasHeader ? block.rows.slice(1) : block.rows;
        return `<div class="wiki-table">${rows.map(row => `<div class="wiki-table-row"><h4>${escape(row[0].text)}</h4><dl>${row.slice(1).map((cell, index) => `<dt>${escape(headings[index + 1] || 'Thông tin')}</dt><dd class="wiki-text">${escape(cell.text)}</dd>`).join('')}</dl></div>`).join('')}</div>`;
      }).join('')}
    </details>`).join('')}
    <p class="wiki-provenance">Nội dung wiki: cộng đồng Arena of Valor Fandom · <a href="${escape(data.heroWiki.license.url)}" target="_blank" rel="noreferrer">${escape(data.heroWiki.license.text)}</a>. Các nguồn có thể mô tả khác phiên bản; không cộng hoặc trộn các hệ số giữa hai bộ kỹ năng.</p>
  </section>`;
}
