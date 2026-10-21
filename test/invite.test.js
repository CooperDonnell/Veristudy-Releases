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
function page({ releaseAssets = assets, fail = false } = {}) {
  const elements = new Map(['title', 'instructions', 'join-code', 'download-windows', 'download-mac', 'install-status'].map(id => [id, {
    textContent: '', disabled: false, handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }
  }]));
  const location = { search: '?code=ABCD1234', href: '' };
  const context = vm.createContext({
    window: { location }, URL, URLSearchParams,
    navigator: { userAgentData: { platform: 'macOS' }, platform: 'MacIntel', userAgent: 'Macintosh' },
    document: { getElementById: id => elements.get(id) },
    fetch: async () => {
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => ({ assets: releaseAssets }) };
    }
  });
  vm.runInContext(source, context);
  return { elements, location, context };
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
  assert.match(html, /invite\.js\?v=20261021/);
  assert.doesNotMatch(source, /navigator\./);
});
