const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || '';
const title = document.getElementById('title');
const instructions = document.getElementById('instructions');
const codeElement = document.getElementById('join-code');
const openButton = document.getElementById('open-app');
const showInstallButton = document.getElementById('show-install');
const installModal = document.getElementById('install-modal');
const cancelInstallButton = document.getElementById('cancel-install');
const downloadInstallerButton = document.getElementById('download-installer');
const installStatus = document.getElementById('install-status');
let appLaunchDetected = false;
let launchCheckTimer = null;

function showInstallPrompt() {
  installModal.classList.remove('hidden');
  downloadInstallerButton.focus();
}

function markAppOpened() {
  if (document.hidden) appLaunchDetected = true;
}

function tryOpeningApp(appUrl) {
  appLaunchDetected = false;
  clearTimeout(launchCheckTimer);
  window.location.href = appUrl;
  launchCheckTimer = setTimeout(() => {
    if (!appLaunchDetected) showInstallPrompt();
  }, 1800);
}

async function downloadInstaller() {
  downloadInstallerButton.disabled = true;
  installStatus.textContent = 'Finding the latest installer…';
  try {
    const response = await fetch('https://api.github.com/repos/CooperDonnell/Veristudy-Releases/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error('Release lookup failed');
    const release = await response.json();
    const platform = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
    const matcher = platform.includes('win') ? /win-x64\.exe$/i : (platform.includes('mac') ? /mac-arm64\.dmg$/i : null);
    const asset = matcher && Array.isArray(release.assets)
      ? release.assets.find((candidate) => matcher.test(String(candidate.name || '')))
      : null;
    if (!asset?.browser_download_url) {
      window.location.href = release.html_url || 'https://github.com/CooperDonnell/Veristudy-Releases/releases/latest';
      return;
    }
    installStatus.textContent = 'Download started. Open the downloaded file to finish installing.';
    window.location.href = asset.browser_download_url;
  } catch {
    window.location.href = 'https://github.com/CooperDonnell/Veristudy-Releases/releases/latest';
  } finally {
    downloadInstallerButton.disabled = false;
  }
}

document.addEventListener('visibilitychange', markAppOpened);
window.addEventListener('pagehide', () => { appLaunchDetected = true; });
showInstallButton.addEventListener('click', showInstallPrompt);
cancelInstallButton.addEventListener('click', () => installModal.classList.add('hidden'));
downloadInstallerButton.addEventListener('click', downloadInstaller);

if (code.length !== 8) {
  title.textContent = 'Invalid Veristudy invite';
  instructions.textContent = 'This invite link is incomplete. Ask the organization owner to copy a new group invite link.';
} else {
  const appUrl = `veristudy://join?code=${encodeURIComponent(code)}`;
  codeElement.textContent = `${code.slice(0, 4)}-${code.slice(4)}`;
  openButton.href = appUrl;
  openButton.classList.remove('hidden');
  openButton.addEventListener('click', (event) => {
    event.preventDefault();
    tryOpeningApp(appUrl);
  });
  tryOpeningApp(appUrl);
}
