/**
 * ThemeManager - Centralized theme management with dynamic CSS loading
 * Each theme has its own CSS file in /themes/ directory
 * Supports 14 themes with individual fonts and styles
 */
(() => {
  const THEMES = [
    'matrix', 'neutral', 'cyan',
    'obsidian', 'aurora', 'dawn', 'monk', 'copper',
    'forestnight', 'inkgold', 'bloodred',
    'github', 'ocean', 'blackred'
  ];

  const THEME_LABELS = {
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

  let currentTheme = 'matrix';
  let storageKey = 'aos-theme';
  let themeLink = null; // <link> element for theme CSS

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
        currentTheme = localStorage.getItem(storageKey) || 'matrix';
      } catch (e) {
        currentTheme = 'matrix';
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
        themeKey = 'matrix';
      }

      currentTheme = themeKey;

      // Set data-theme attribute
      document.documentElement.setAttribute('data-theme', themeKey);

      // Load theme CSS file
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
