const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || '';
const title = document.getElementById('title');
const instructions = document.getElementById('instructions');
const codeElement = document.getElementById('join-code');
const openButton = document.getElementById('open-app');

if (code.length !== 8) {
  title.textContent = 'Invalid Veristudy invite';
  instructions.textContent = 'This invite link is incomplete. Ask the organization owner to copy a new group invite link.';
} else {
  const appUrl = `veristudy://join?code=${encodeURIComponent(code)}`;
  codeElement.textContent = `${code.slice(0, 4)}-${code.slice(4)}`;
  openButton.href = appUrl;
  openButton.classList.remove('hidden');
  window.location.replace(appUrl);
}
