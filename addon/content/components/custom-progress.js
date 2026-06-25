/**
 * Custom Progress Bar Component
 * A centralized progress bar manager to prevent native `<progressmeter>` rendering bugs.
 */

(function () {
  /**
   * Creates or updates a custom HTML progress bar.
   *
   * @param {HTMLElement} container - The wrapper element where the progress bar lives.
   * @param {number} percent - The percentage (0-100) to display.
   */
  function setProgress(container, percent) {
    if (!container) return;

    // Ensure the container has the right base class
    if (!container.classList.contains("custom-progress-container")) {
      container.classList.add("custom-progress-container");
    }

    // Find or create the inner bar element
    let bar = container.querySelector(".custom-progress-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "custom-progress-bar";
      container.appendChild(bar);
    }

    // Clamp value between 0 and 100
    const clamped = Math.max(0, Math.min(100, percent || 0));
    bar.style.width = clamped + "%";
  }

  // Export globally
  window.customProgress = {
    set: setProgress,
  };
})();
