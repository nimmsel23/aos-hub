(() => {
  const STORAGE_KEY = 'aos-theme';
  const THEMES = ['matrix', 'neutral', 'cyan'];

  // Get saved theme or default to 'matrix'
  let currentTheme = localStorage.getItem(STORAGE_KEY) || 'matrix';

  // Apply theme on load
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'theme-toggle';
  toggleBtn.textContent = getThemeLabel(currentTheme);
  toggleBtn.setAttribute('aria-label', 'Switch theme');
  toggleBtn.addEventListener('click', switchTheme);

  // Add to body when DOM is ready
  if (document.body) {
    document.body.appendChild(toggleBtn);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(toggleBtn);
    });
  }

  function switchTheme() {
    const currentIndex = THEMES.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    currentTheme = THEMES[nextIndex];

    // Apply theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem(STORAGE_KEY, currentTheme);

    // Update button label
    toggleBtn.textContent = getThemeLabel(currentTheme);

    // Optional: animate transition
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }

  function getThemeLabel(theme) {
    const labels = {
      'matrix': '⚡ Matrix',
      'neutral': '🌙 Neutral',
      'cyan': '💎 Cyan'
    };
    return labels[theme] || theme;
  }

  // Expose for external use if needed
  window.aosTheme = {
    get: () => currentTheme,
    set: (theme) => {
      if (THEMES.includes(theme)) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem(STORAGE_KEY, currentTheme);
        toggleBtn.textContent = getThemeLabel(currentTheme);
      }
    },
    available: THEMES
  };
})();
