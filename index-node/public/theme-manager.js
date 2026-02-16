/**
 * ThemeManager - Centralized theme management
 * Uses data-theme as primary mechanism.
 * If /themes.css is not present, falls back to loading /themes/base.css + /themes/<theme>.css.
 */
(() => {
  const MIGRATION_KEY = 'aos-theme-default-migrated-v1';
  const THEMES = [
    'slate', 'matrix', 'neutral', 'cyan',
    'obsidian', 'aurora', 'dawn', 'monk', 'copper',
    'forestnight', 'inkgold', 'bloodred',
    'github', 'ocean', 'blackred'
  ];

  const THEME_LABELS = {
    'slate': '🧭 Slate',
    'matrix': '⚡ Matrix',
    'neutral': '🌙 Neutral',
    'cyan': '💎 Cyan',
    'obsidian': '🔮 Obsidian',
    'aurora': '🌌 Aurora',
    'dawn': '🌅 Dawn',
    'monk': '📜 Monk',
    'copper': '🪙 Copper',
    'forestnight': '🌲 Forest Night',
    'inkgold': '✨ Ink & Gold',
    'bloodred': '🩸 Blood Red',
    'github': '💻 GitHub',
    'ocean': '🌊 Ocean',
    'blackred': '⚫ Black/Red'
  };

  let currentTheme = 'slate';
  let storageKey = 'aos-theme';
  let baseLink = null; // <link> element for base CSS
  let themeLink = null; // <link> element for active theme CSS

  const ThemeManager = {
    /**
     * Initialize theme system
     * @param {string} key - localStorage key for this centre
     * @param {Object} options - { mode: 'dropdown', selectId: 'theme-select' }
     */
    init(key = 'aos-theme', options = {}) {
      storageKey = key;

      // Load saved theme
      try {
        const saved = localStorage.getItem(storageKey) || "";
        const migrationDone = localStorage.getItem(MIGRATION_KEY) === "1";
        if (THEMES.includes(saved)) {
          currentTheme = (!migrationDone && saved === "matrix") ? "slate" : saved;
        } else {
          currentTheme = "slate";
        }
        if (!migrationDone) {
          localStorage.setItem(MIGRATION_KEY, "1");
          localStorage.setItem(storageKey, currentTheme);
        }
      } catch (e) {
        currentTheme = 'slate';
      }

      // Apply theme immediately
      this.applyTheme(currentTheme);

      // Setup UI based on mode
      if (options.mode === 'toggle') {
        this.setupToggleButton();
      } else if (options.mode === 'dropdown' || !options.mode) {
        this.setupDropdown(options.selectId);
      }

      return this;
    },

    /**
     * Apply a theme by loading its CSS file
     * @param {string} themeKey - Theme identifier
     */
    applyTheme(themeKey) {
      if (!THEMES.includes(themeKey)) {
        themeKey = 'slate';
      }

      currentTheme = themeKey;

      // Set data-theme attribute
      document.documentElement.setAttribute('data-theme', themeKey);

      // Keep optional dynamic CSS fallback in sync
      this.loadThemeCSS(themeKey);

      // Save to localStorage
      try {
        localStorage.setItem(storageKey, themeKey);
      } catch (e) {
        // localStorage not available
      }

      // Update UI elements
      this.updateUI(themeKey);
    },

    /**
     * Dynamically load theme CSS file
     * @param {string} themeKey - Theme identifier
     */
    loadThemeCSS(themeKey) {
      // Normal path: pages include /themes.css manifest and rely on data-theme only.
      const hasThemeManifest = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some((link) => (link.getAttribute("href") || "").includes("/themes.css"));
      if (hasThemeManifest) return;

      if (!baseLink || !baseLink.parentNode) {
        baseLink = document.createElement("link");
        baseLink.rel = "stylesheet";
        baseLink.href = "/themes/base.css";
        baseLink.id = "dynamic-theme-base";
        document.head.appendChild(baseLink);
      }

      // Remove old theme link if exists
      if (themeLink && themeLink.parentNode) {
        themeLink.parentNode.removeChild(themeLink);
      }

      // Create new link element
      themeLink = document.createElement('link');
      themeLink.rel = 'stylesheet';
      themeLink.href = `/themes/${themeKey}.css`;
      themeLink.id = 'dynamic-theme';

      // Add to head
      document.head.appendChild(themeLink);
    },

    /**
     * Update UI elements (dropdown/button) to reflect current theme
     */
    updateUI(themeKey) {
      // Update dropdown if exists
      const select = document.getElementById('theme-select');
      if (select) {
        select.value = themeKey;
      }

      // Update toggle button if exists
      const toggleBtn = document.querySelector('.theme-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = this.getThemeLabel(themeKey);
      }
    },

    /**
     * Get human-readable label for theme
     */
    getThemeLabel(theme) {
      return THEME_LABELS[theme] || theme;
    },

    /**
     * Get current theme
     */
    getCurrentTheme() {
      return currentTheme;
    },

    /**
     * Setup dropdown mode
     * @param {string} selectId - ID of <select> element
     */
    setupDropdown(selectId = 'theme-select') {
      const select = document.getElementById(selectId);
      if (!select) {
        console.warn(`ThemeManager: Select element #${selectId} not found`);
        return;
      }

      // Populate if empty
      if (select.children.length === 0) {
        this.populateDropdown(select);
      }

      // Set current value
      select.value = currentTheme;

      // Add event listener
      select.addEventListener('change', () => {
        this.applyTheme(select.value);
      });
    },

    /**
     * Populate dropdown with all themes
     */
    populateDropdown(select) {
      select.innerHTML = ''; // Clear existing

      // Main themes
      this.addOption(select, 'slate');
      this.addOption(select, 'matrix');
      this.addOption(select, 'neutral');
      this.addOption(select, 'cyan');

      // Separator
      this.addSeparator(select);

      // Legacy themes (Voice Centre)
      const legacyThemes = ['obsidian', 'aurora', 'dawn', 'monk', 'copper', 'forestnight', 'inkgold', 'bloodred'];
      legacyThemes.forEach(theme => this.addOption(select, theme));

      // Separator
      this.addSeparator(select);

      // Door legacy
      this.addOption(select, 'github');
      this.addOption(select, 'ocean');
      this.addOption(select, 'blackred');
    },

    /**
     * Add option to select
     */
    addOption(select, themeKey) {
      const option = document.createElement('option');
      option.value = themeKey;
      option.textContent = this.getThemeLabel(themeKey);
      select.appendChild(option);
    },

    /**
     * Add separator to select
     */
    addSeparator(select) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '────────────';
      select.appendChild(separator);
    },

    /**
     * Setup toggle button mode (for Index page)
     */
    setupToggleButton() {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'theme-toggle';
      toggleBtn.textContent = this.getThemeLabel(currentTheme);
      toggleBtn.setAttribute('aria-label', 'Switch theme');
      toggleBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; font-family: inherit;';

      toggleBtn.addEventListener('click', () => {
        const currentIndex = THEMES.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        this.applyTheme(THEMES[nextIndex]);
      });

      // Append to body
      if (document.body) {
        document.body.appendChild(toggleBtn);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(toggleBtn);
        });
      }
    }
  };

  // Expose globally
  window.ThemeManager = ThemeManager;
})();
