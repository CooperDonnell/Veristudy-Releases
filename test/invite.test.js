const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../join/invite.js'), 'utf8');
const windowsUrl = 'https://github.com/CooperDonnell/Veristudy-Releases/releases/download/v1.0.7/Veristudy-1.0.7-win-x64.exe';
const macUrl = 'https://github.com/CooperDonnell/Veristudy-Releases/releases/download/v1.0.7/Veristudy-1.0.7-mac-arm64.dmg';
const assets = [
  { name: 'Veristudy-1.0.7-mac-arm64.dmg', browser_download_url: macUrl },
  { name: 'Veristudy-1.0.7-win-x64.exe', browser_download_url: windowsUrl }
];
function page({ releaseAssets = assets, fail = false, search = '?code=ABCD1234', clipboardFails = false } = {}) {
  let copiedCode;
  const elements = new Map(['title', 'instructions', 'join-code', 'download-windows', 'download-mac', 'install-status', 'initial-code', 'download-join-help', 'download-join-code', 'copy-join-code'].map(id => [id, {
    textContent: '', disabled: false, hidden: id === 'download-join-help', scrolled: false, scrollIntoView() { this.scrolled = true; }, handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }
  }]));
  const location = { search, href: '' };
  const context = vm.createContext({
    window: { location }, URL, URLSearchParams,
    navigator: { clipboard: { writeText: async value => { if (clipboardFails) throw new Error('denied'); copiedCode = value; } }, userAgentData: { platform: 'macOS' }, platform: 'MacIntel', userAgent: 'Macintosh' },
    document: { getElementById: id => elements.get(id) },
    fetch: async () => {
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => ({ assets: releaseAssets }) };
    }
  });
  vm.runInContext(source, context);
  return { elements, location, context, getCopiedCode: () => copiedCode };
}
test('Windows choice downloads EXE even when the browser reports Mac and DMG is listed first', async () => {
  const { elements, location } = page();
  await elements.get('download-windows').handlers.click();
  assert.equal(location.href, windowsUrl);
  assert.match(elements.get('install-status').textContent, /Windows.*\.exe/);
  assert.equal(elements.get('download-windows').disabled, false);
});
test('Mac choice downloads the Apple silicon DMG', async () => {
  const { elements, location } = page();
  await elements.get('download-mac').handlers.click();
  assert.equal(location.href, macUrl);
});
test('missing Windows asset never substitutes the Mac installer', async () => {
  const { elements, location } = page({ releaseAssets: assets.slice(0, 1) });
  await elements.get('download-windows').handlers.click();
  assert.equal(location.href, '');
  assert.match(elements.get('install-status').textContent, /could not start.*\.exe/);
});
test('network failure keeps the explicit platform choice and offers the manual download page', async () => {
  const { elements, location } = page({ fail: true });
  await elements.get('download-windows').handlers.click();
  assert.equal(location.href, '');
  assert.match(elements.get('install-status').textContent, /All downloads and release notes/);
  assert.equal(elements.get('download-mac').disabled, false);
});
test('installer addresses outside the public release repo are rejected', async () => {
  const { elements, location } = page({ releaseAssets: [{ name: 'Veristudy-win-x64.exe', browser_download_url: 'https://example.com/Veristudy-win-x64.exe' }] });
  await elements.get('download-windows').handlers.click();
  assert.equal(location.href, '');
});
test('manual join code is preserved and the page has explicit download labels', () => {
  const { elements } = page();
  assert.equal(elements.get('join-code').textContent, 'ABCD-1234');
  const html = fs.readFileSync(path.join(__dirname, '../join/index.html'), 'utf8');
  assert.match(html, /Download for Windows \(\.exe\)/);
  assert.match(html, /Download for Mac \(\.dmg\)/);
  assert.match(html, /invite\.js\?v=20261021-code/);
  assert.doesNotMatch(source, /navigator\.(userAgent|platform)/);
});

test('both downloads display the setup code and keep it visible after the download starts', async () => {
  for (const platform of ['windows', 'mac']) {
    const { elements } = page();
    await elements.get(`download-${platform}`).handlers.click();
    assert.equal(elements.get('download-join-help').hidden, false);
    assert.equal(elements.get('download-join-help').scrolled, true);
    assert.equal(elements.get('download-join-code').textContent, 'ABCD-1234');
    assert.equal(elements.get('initial-code').hidden, true);
  }
});
test('copy button copies the displayed join code and handles denied clipboard access', async () => {
  const normal = page();
  await normal.elements.get('copy-join-code').handlers.click();
  assert.equal(normal.getCopiedCode(), 'ABCD-1234');
  assert.equal(normal.elements.get('copy-join-code').textContent, 'Copied!');
  const denied = page({ clipboardFails: true });
  await denied.elements.get('copy-join-code').handlers.click();
  assert.equal(denied.elements.get('copy-join-code').textContent, 'Select and copy the code above');
  assert.equal(denied.elements.get('download-join-code').textContent, 'ABCD-1234');
});
test('downloads without a valid invite code do not show an empty setup code', async () => {
  for (const search of ['', '?code=ABC']) {
    const { elements, location } = page({ search });
    await elements.get('download-windows').handlers.click();
    assert.equal(location.href, windowsUrl);
    assert.equal(elements.get('initial-code').hidden, true);
    assert.equal(elements.get('download-join-help').hidden, true);
  }
});
