/**
 * ThemeManager - Centralized theme management for all αOS centres
 * Supports 14 themes: 3 unified (Matrix, Neutral, Cyan) + 11 legacy
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

  const ThemeManager = {
    /**
     * Initialize theme system
     * @param {string} key - localStorage key for this centre
     * @param {Object} options - { mode: 'dropdown'|'toggle', selectId: 'theme-select' }
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
        this.setupToggleButton(options.container);
      } else if (options.mode === 'dropdown') {
        this.setupDropdown(options.selectId);
      }

      return this;
    },

    /**
     * Apply a theme
     * @param {string} themeKey - Theme identifier
     */
    applyTheme(themeKey) {
      if (!THEMES.includes(themeKey)) {
        themeKey = 'matrix';
      }

      currentTheme = themeKey;
      const html = document.documentElement;
      const body = document.body;

      // Apply data-theme attribute (primary method)
      html.setAttribute('data-theme', themeKey);

      // Clean up legacy class-based themes
      if (body) {
        body.className = body.className.replace(/theme-\w+/g, '').trim();
      }

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
     * @param {HTMLElement} container - Container to append button to
     */
    setupToggleButton(container) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'theme-toggle';
      toggleBtn.textContent = this.getThemeLabel(currentTheme);
      toggleBtn.setAttribute('aria-label', 'Switch theme');

      toggleBtn.addEventListener('click', () => {
        const currentIndex = THEMES.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        this.applyTheme(THEMES[nextIndex]);
      });

      // Append to container or body
      if (container) {
        container.appendChild(toggleBtn);
      } else if (document.body) {
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
