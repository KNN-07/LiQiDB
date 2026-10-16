import { describe, expect, test } from 'bun:test';
import { extractWikiDetails } from '../scripts/sync-fandom.mjs';

describe('revision-pinned wiki extraction', () => {
  test('preserves nested skill text, cell boundaries and recommendations', async () => {
    const sections = await extractWikiDetails(`
      <div class="mw-parser-output">
        <aside><h2>Sidebar</h2></aside>
        <h2><span class="mw-headline" id="skills">Kỹ năng</span></h2>
        <p>Giữ <b>lượt lướt</b> để thoát.</p>
        <table class="wikitable"><tr><th>Chiêu</th><th>Hiệu ứng</th><th>Mô tả</th></tr>
          <tr><td>Chiêu 1 (Kiếm)</td><td>Vật lý<br>Hất tung</td>
          <td>Sát thương <span>250 (+80% công)</span>.<br>Giữ &amp; đổi góc.</td></tr>
        </table>
        <h3><span class="mw-headline" id="items">Trang bị</span></h3>
        <div class="wikia-gallery-item"><div class="lightbox-caption"><a>Giày thuật sĩ</a></div></div>
        <h2><span class="mw-headline" id="navigation">Xem thêm</span></h2>
        <ul><li>Không nhập điều hướng.</li></ul>
      </div>`, [
      { anchor: 'skills', line: 'Kỹ năng', level: '2' },
      { anchor: 'items', line: 'Trang bị', level: '3' },
      { anchor: 'navigation', line: 'Xem thêm', level: '2' },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].blocks[0]).toEqual({ kind: 'paragraph', text: 'Giữ lượt lướt để thoát.' });
    const row = sections[0].blocks[1].rows[1];
    expect(row).toHaveLength(3);
    expect(row[1].text).toBe('Vật lý\nHất tung');
    expect(row[2].text).toBe('Sát thương 250 (+80% công).\nGiữ & đổi góc.');
    expect(sections[1].blocks).toEqual([{ kind: 'bullet', text: 'Giày thuật sĩ' }]);
  });

  test('keeps empty and unrelated sections out of the imported payload', async () => {
    const sections = await extractWikiDetails(`
      <div class="mw-parser-output">
        <p>Intro without a section.</p>
        <h2><span class="mw-headline" id="profile">Thông tin</span></h2><p> </p>
        <h2><span class="mw-headline" id="links">Xem thêm</span></h2><p>Other links.</p>
      </div>`, [
      { anchor: 'profile', line: 'Thông tin', level: '2' },
      { anchor: 'links', line: 'Xem thêm', level: '2' },
    ]);
    expect(sections).toEqual([]);
  });
});
