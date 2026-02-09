/**
 * Collapsible Sidebars - Chapters & GPT hover menus
 */
(() => {
  // Add collapse styles
  const style = document.createElement('style');
  style.textContent = `
    /* Collapsed sidebar state */
    .doc-panel,
    .gpt-panel {
      position: fixed;
      width: 60px;
      height: auto;
      max-height: 80vh;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
      cursor: pointer;
    }

    .doc-panel {
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
    }

    .gpt-panel {
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
    }

    .doc-panel:hover,
    .gpt-panel:hover {
      width: 320px;
      cursor: default;
    }

    .doc-panel .doc-grid,
    .gpt-panel .gpt-grid {
      opacity: 0;
      transition: opacity 0.2s ease 0s;
    }

    .doc-panel:hover .doc-grid,
    .gpt-panel:hover .gpt-grid {
      opacity: 1;
      transition: opacity 0.3s ease 0.1s;
    }

    /* Center main content */
    .index-layout {
      display: block;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .menu-panel {
      width: 100%;
    }

    /* Mobile: hide sidebars completely */
    @media (max-width: 968px) {
      .doc-panel,
      .gpt-panel {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
})();
