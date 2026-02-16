/**
 * Layout Switcher - Multiple layout options
 */
(() => {
  const STORAGE_KEY = 'aos-layout';
  const LAYOUTS = {
    'grid': { label: 'Dock Hover', desc: 'Bottom dock + side rails' },
    'compact': { label: 'Fullscreen', desc: 'No side rails, dense cards' },
    'list': { label: 'Terminal', desc: 'Linear list flow' },
    'wide': { label: 'Dashboard', desc: 'Two-column large cards' },
    'minimal': { label: 'Minimal', desc: 'Text-first view' },
    'masonry': { label: 'Focus', desc: 'Top priorities only' },
    'cards': { label: 'Zen', desc: 'Centered menu canvas' }
  };

  const storedLayout = localStorage.getItem(STORAGE_KEY) || "";
  let currentLayout = storedLayout && LAYOUTS[storedLayout] ? storedLayout : "grid";
  if (currentLayout !== storedLayout) {
    localStorage.setItem(STORAGE_KEY, currentLayout);
  }

  // Apply layout on load
  document.documentElement.setAttribute('data-layout', currentLayout);

  // Create layout selector dropdown
  const layoutSelector = document.createElement('div');
  layoutSelector.className = 'layout-selector';
  layoutSelector.innerHTML = `
    <button class="layout-toggle" id="layoutToggle" aria-label="Change layout">
      ${LAYOUTS[currentLayout].label}
    </button>
    <div class="layout-dropdown" id="layoutDropdown">
      ${Object.entries(LAYOUTS).map(([key, { label, desc }]) => `
        <button class="layout-option ${key === currentLayout ? 'active' : ''}" data-layout="${key}">
          <span class="layout-label">${label}</span>
          <span class="layout-desc">${desc}</span>
        </button>
      `).join('')}
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .layout-selector {
      position: fixed;
      bottom: 18px;
      left: 18px;
      z-index: 99;
    }

    .layout-toggle {
      background: var(--bg-panel);
      border: 1px solid var(--border-primary);
      border-radius: var(--border-radius-sm, 8px);
      padding: 7px 10px;
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 0.72em;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-sm);
    }

    .layout-toggle:hover {
      transform: translateY(-1px);
      border-color: var(--text-accent);
      box-shadow: var(--shadow-md);
    }

    .layout-dropdown {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      background: var(--bg-modal);
      border: 1px solid var(--border-primary);
      border-radius: var(--border-radius-md, 10px);
      padding: 7px;
      min-width: 200px;
      box-shadow: var(--shadow-lg);
      display: none;
      flex-direction: column;
      gap: 4px;
      backdrop-filter: blur(10px);
    }

    .layout-dropdown.show {
      display: flex;
    }

    .layout-option {
      background: transparent;
      border: 1px solid var(--border-tertiary);
      border-radius: 6px;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .layout-option:hover {
      background: var(--bg-secondary);
      border-color: var(--border-primary);
      transform: translateX(2px);
    }

    .layout-option.active {
      background: var(--bg-secondary);
      border-color: var(--text-accent);
      box-shadow: 0 0 0 1px var(--text-accent);
    }

    .layout-label {
      color: var(--text-primary);
      font-size: 0.78em;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .layout-desc {
      color: var(--text-muted);
      font-size: 0.68em;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .layout-selector {
        left: auto;
        top: auto;
        bottom: 20px;
        right: 20px;
      }

      .layout-dropdown {
        left: auto;
        right: 0;
        bottom: calc(100% + 8px);
        top: auto;
      }
    }
  `;
  document.head.appendChild(style);

  // Add to DOM
  if (document.body) {
    document.body.appendChild(layoutSelector);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(layoutSelector);
    });
  }

  // Toggle dropdown
  const toggle = layoutSelector.querySelector('#layoutToggle');
  const dropdown = layoutSelector.querySelector('#layoutDropdown');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });

  // Layout selection
  layoutSelector.querySelectorAll('.layout-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layout = btn.dataset.layout;
      applyLayout(layout);
      dropdown.classList.remove('show');
    });
  });

  function applyLayout(layout) {
    if (!LAYOUTS[layout]) return;

    currentLayout = layout;
    document.documentElement.setAttribute('data-layout', layout);
    localStorage.setItem(STORAGE_KEY, layout);

    // Update toggle button
    toggle.textContent = LAYOUTS[layout].label;

    // Update active state
    layoutSelector.querySelectorAll('.layout-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });
  }
})();
