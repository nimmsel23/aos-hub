/**
 * Theme Switcher - All themes
 */
(() => {
  const STORAGE_KEY = 'aos-theme';
  const MIGRATION_KEY = 'aos-theme-default-migrated-v1';
  const THEMES = {
    // Main themes
    'slate': { label: '🧭 Slate', rain: false },
    'matrix': { label: '⚡ Matrix', rain: true },
    'neutral': { label: '🌙 Neutral', rain: false },
    'cyan': { label: '💎 Cyan', rain: true },
    // Voice legacy
    'obsidian': { label: '🔮 Obsidian', rain: false },
    'aurora': { label: '🌌 Aurora', rain: false },
    'dawn': { label: '🌅 Dawn', rain: false },
    'monk': { label: '📜 Monk', rain: false },
    'copper': { label: '🪙 Copper', rain: false },
    'forestnight': { label: '🌲 Forest', rain: false },
    'inkgold': { label: '✨ Ink&Gold', rain: false },
    'bloodred': { label: '🩸 Blood', rain: false },
    // Door legacy
    'github': { label: '💻 GitHub', rain: false },
    'ocean': { label: '🌊 Ocean', rain: false },
    'blackred': { label: '⚫ Black/Red', rain: false }
  };

  const savedTheme = localStorage.getItem(STORAGE_KEY) || "";
  const migrationDone = localStorage.getItem(MIGRATION_KEY) === "1";
  let currentTheme = "slate";
  if (THEMES[savedTheme]) {
    currentTheme = (!migrationDone && savedTheme === "matrix") ? "slate" : savedTheme;
  }
  if (currentTheme !== savedTheme) {
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }
  if (!migrationDone) {
    localStorage.setItem(MIGRATION_KEY, "1");
  }

  // Apply theme on load
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Create theme selector dropdown
  const themeSelector = document.createElement('div');
  themeSelector.className = 'theme-selector';
  themeSelector.innerHTML = `
    <button class="theme-toggle" id="themeToggle" aria-label="Switch theme">
      ${THEMES[currentTheme].label}
    </button>
    <div class="theme-dropdown" id="themeDropdown">
      <div class="theme-section">
        <div class="theme-section-title">Main</div>
        ${['slate', 'matrix', 'neutral', 'cyan'].map(key => `
          <button class="theme-option ${key === currentTheme ? 'active' : ''}" data-theme="${key}">
            ${THEMES[key].label}
          </button>
        `).join('')}
      </div>
      <div class="theme-section">
        <div class="theme-section-title">Voice</div>
        ${['obsidian', 'aurora', 'dawn', 'monk', 'copper', 'forestnight', 'inkgold', 'bloodred'].map(key => `
          <button class="theme-option ${key === currentTheme ? 'active' : ''}" data-theme="${key}">
            ${THEMES[key].label}
          </button>
        `).join('')}
      </div>
      <div class="theme-section">
        <div class="theme-section-title">Door</div>
        ${['github', 'ocean', 'blackred'].map(key => `
          <button class="theme-option ${key === currentTheme ? 'active' : ''}" data-theme="${key}">
            ${THEMES[key].label}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .theme-selector {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
    }

    .theme-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: var(--bg-modal);
      border: 2px solid var(--border-primary);
      border-radius: var(--border-radius-md, 10px);
      padding: 12px;
      min-width: 240px;
      max-height: 70vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
      display: none;
      flex-direction: column;
      gap: 12px;
      backdrop-filter: blur(10px);
    }

    .theme-dropdown.show {
      display: flex;
    }

    .theme-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .theme-section-title {
      color: var(--text-muted);
      font-size: 0.7em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 4px 8px;
      opacity: 0.7;
    }

    .theme-option {
      background: transparent;
      border: 1px solid var(--border-tertiary);
      border-radius: 6px;
      padding: 8px 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-primary);
      font-size: 0.85em;
    }

    .theme-option:hover {
      background: var(--bg-secondary);
      border-color: var(--border-primary);
      transform: translateX(4px);
    }

    .theme-option.active {
      background: var(--bg-secondary);
      border-color: var(--text-accent);
      box-shadow: 0 0 0 1px var(--text-accent);
    }

    @media (max-width: 768px) {
      .theme-selector {
        top: 20px;
        right: 20px;
      }
    }
  `;
  document.head.appendChild(style);

  // Add to DOM
  if (document.body) {
    document.body.appendChild(themeSelector);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(themeSelector);
    });
  }

  // Toggle dropdown
  const toggle = themeSelector.querySelector('#themeToggle');
  const dropdown = themeSelector.querySelector('#themeDropdown');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });

  // Theme selection
  themeSelector.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const theme = btn.dataset.theme;
      applyTheme(theme);
      dropdown.classList.remove('show');
    });
  });

  function applyTheme(theme) {
    if (!THEMES[theme]) return;

    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Update toggle button
    toggle.textContent = THEMES[theme].label;

    // Update active state
    themeSelector.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }
})();
