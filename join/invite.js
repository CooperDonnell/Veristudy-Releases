const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || '';
const title = document.getElementById('title');
const instructions = document.getElementById('instructions');
const codeElement = document.getElementById('join-code');
const windowsButton = document.getElementById('download-windows');
const macButton = document.getElementById('download-mac');
const installStatus = document.getElementById('install-status');
const releaseApi = 'https://api.github.com/repos/CooperDonnell/Veristudy-Releases/releases/latest';
let downloading = false;

async function downloadInstaller(platform) {
  if (downloading || !['windows', 'mac'].includes(platform)) return;
  downloading = true;
  windowsButton.disabled = true;
  macButton.disabled = true;
  const label = platform === 'windows' ? 'Windows' : 'Mac';
  const extension = platform === 'windows' ? '.exe' : '.dmg';
  installStatus.textContent = `Finding the latest ${label} installer…`;
  try {
    const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error('Release lookup failed');
    const release = await response.json();
    const matcher = platform === 'windows' ? /win-x64\.exe$/i : /mac-arm64\.dmg$/i;
    const asset = Array.isArray(release.assets)
      ? release.assets.find((candidate) => matcher.test(String(candidate.name || '')))
      : null;
    if (!asset?.browser_download_url) throw new Error('Installer not available');
    const url = new URL(asset.browser_download_url);
    if (url.origin !== 'https://github.com'
      || !url.pathname.startsWith('/CooperDonnell/Veristudy-Releases/releases/download/')
      || !matcher.test(decodeURIComponent(url.pathname))) {
      throw new Error('Unexpected installer address');
    }
    installStatus.textContent = `${label} download started (${extension}). Open the downloaded installer to update or install Veristudy.`;
    window.location.href = url.href;
  } catch {
    installStatus.textContent = `The ${label} download could not start. Open “All downloads and release notes” above and choose the ${extension} installer.`;
  } finally {
    downloading = false;
    windowsButton.disabled = false;
    macButton.disabled = false;
  }
}

windowsButton.addEventListener('click', () => downloadInstaller('windows'));
macButton.addEventListener('click', () => downloadInstaller('mac'));

if (code.length !== 8) {
  title.textContent = 'Download Veristudy';
  instructions.textContent = 'Choose the download for your computer. Ask your organization owner for the group invite link or join code if you are creating a new account.';
} else {
  codeElement.textContent = `${code.slice(0, 4)}-${code.slice(4)}`;
}
