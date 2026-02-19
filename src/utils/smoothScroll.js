export function smoothScrollToHash(hash, closeMenu) {
  if (!hash || !hash.startsWith('#')) return;
  const target = document.querySelector(hash);
  if (!target) return;

  const navHeight = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '74',
    10
  );

  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 10;
  window.scrollTo({ top, behavior: 'smooth' });
  if (closeMenu) closeMenu();
}
