/**
 * Modal & Focus Management Utilities
 * SRS References: NFR-USAB-02 (WCAG 2.1 AA Accessibility), NFR-USAB-03
 *
 * Implements WAI-ARIA Dialog focus trapping, keyboard navigation,
 * and focus restoration helpers for accessible modals and confirm dialogs.
 */

export const CONFIRM_DIALOG_VARIANTS = {
  DANGER: 'danger',
  WARNING: 'warning',
  PRIMARY: 'primary',
  INFO: 'info',
};

/**
 * Query all keyboard-focusable elements inside a given container.
 * Filters out disabled or hidden elements.
 *
 * @param {HTMLElement} container - The DOM node to search within.
 * @returns {HTMLElement[]} Array of focusable HTML elements.
 */
export function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') {
    return [];
  }

  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll(selector));

  return elements.filter((el) => {
    // Check if element is displayed / rendered
    if (
      el.hasAttribute('disabled') ||
      el.getAttribute('aria-hidden') === 'true'
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Traps keyboard Tab navigation strictly within a container element.
 *
 * @param {KeyboardEvent} event - The keydown event.
 * @param {HTMLElement} container - The dialog container element.
 * @returns {boolean} True if the tab event was trapped/handled, false otherwise.
 */
export function handleTabFocusTrap(event, container) {
  if (!event || event.key !== 'Tab' || !container) {
    return false;
  }

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }

  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (
      document.activeElement === firstElement ||
      !container.contains(document.activeElement)
    ) {
      lastElement.focus();
      event.preventDefault();
      return true;
    }
  } else {
    if (
      document.activeElement === lastElement ||
      !container.contains(document.activeElement)
    ) {
      firstElement.focus();
      event.preventDefault();
      return true;
    }
  }

  return false;
}
