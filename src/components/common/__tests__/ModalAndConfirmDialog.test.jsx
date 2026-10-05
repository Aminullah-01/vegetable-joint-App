import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { Modal } from '../Modal';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  getFocusableElements,
  handleTabFocusTrap,
  CONFIRM_DIALOG_VARIANTS,
} from '../../../utils/modal';
import { STRINGS } from '../../../constants';

describe('Modal Component (FE-036, NFR-USAB-02, NFR-USAB-03)', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders in document body with role="dialog", aria-modal="true", and accessible title/description', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Listing Options"
        description="Configure visibility for this listing"
      >
        <p>Modal content body</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const titleEl = screen.getByText('Listing Options');
    expect(dialog).toHaveAttribute('aria-labelledby', titleEl.id);

    const descEl = screen.getByText('Configure visibility for this listing');
    expect(dialog).toHaveAttribute('aria-describedby', descEl.id);
  });

  it('locks body scroll when open and restores previous overflow on unmount', () => {
    document.body.style.overflow = 'visible';

    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Scroll Lock Test">
        <p>Content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('visible');
  });

  it('calls onClose when the close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Closeable Modal">
        <p>Content</p>
      </Modal>
    );

    const closeBtn = screen.getByTestId('modal-dialog-close-button');
    expect(closeBtn).toHaveAttribute(
      'aria-label',
      STRINGS.MODAL?.CLOSE || 'Close dialog'
    );
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside on the backdrop if closeOnBackdrop is true', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnBackdrop={true}
        title="Backdrop Test"
      >
        <p>Inside content</p>
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-dialog-backdrop');
    await user.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the dialog card', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnBackdrop={true}
        title="Backdrop Ignore Test"
      >
        <p>Inside content</p>
      </Modal>
    );

    const insideText = screen.getByText('Inside content');
    await user.click(insideText);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not close on backdrop click when closeOnBackdrop is false', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnBackdrop={false}
        title="Persistent Modal"
      >
        <p>Important content</p>
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-dialog-backdrop');
    await user.click(backdrop);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnEscape={true}
        title="Escape Test"
      >
        <input type="text" placeholder="Focused field" />
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape is false', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnEscape={false}
        title="Escape Disabled"
      >
        <p>Content</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('restores focus to trigger element upon closing', async () => {
    function ModalWithTrigger() {
      const [isOpen, setIsOpen] = useState(true);
      const triggerRef = useRef(null);
      return (
        <div>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen(true)}
          >
            Open Modal Trigger
          </button>
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            returnFocusRef={triggerRef}
            title="Focus Return Test"
          >
            <button type="button" onClick={() => setIsOpen(false)}>
              Close Inside
            </button>
          </Modal>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<ModalWithTrigger />);
    const trigger = screen.getByRole('button', { name: 'Open Modal Trigger' });
    const closeInsideBtn = screen.getByRole('button', { name: 'Close Inside' });

    await user.click(closeInsideBtn);
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('renders footer actions when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Footer Modal"
        footer={<button type="button">Save Changes</button>}
      >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByTestId('modal-dialog-footer')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save Changes' })
    ).toBeInTheDocument();
  });
});

describe('ConfirmDialog Component (FE-036, SEL-04, ORD-07, NFR-USAB-03)', () => {
  it('renders delete confirmation dialog with soft delete notice (SEL-04)', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        type="danger"
        title="Delete Vegetable Listing"
        message="This product will be soft-deleted and hidden from search (SEL-04)."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Vegetable Listing')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This product will be soft-deleted and hidden from search (SEL-04).'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-icon')).toBeInTheDocument();
  });

  it('renders optional details box for product or order info', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        type="danger"
        title="Delete Fresh Ugwu"
        message="Are you sure you want to delete this listing?"
        details={
          <div data-testid="listing-details">
            <span>Price: ₦1,200</span>
            <span>Stock: 45 bunches</span>
          </div>
        }
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('listing-details')).toBeInTheDocument();
    expect(screen.getByText('Price: ₦1,200')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked in standard confirmation', async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        type="danger"
        confirmText="Confirm Delete"
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Delete' });
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        cancelText="Keep Listing"
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Keep Listing' });
    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('enforces required cancellation reason per ORD-07', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        type="warning"
        title="Cancel Order #ORD-2026-001"
        message="Please provide a reason to cancel this order."
        requireReason={true}
        reasonRequiredError="A reason is required to cancel this order."
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    );

    expect(
      screen.getByTestId('confirm-dialog-reason-section')
    ).toBeInTheDocument();
    const reasonInput = screen.getByTestId('confirm-dialog-reason-input');
    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button');

    // Attempting to confirm with empty input triggers validation error and blocks onConfirm
    await user.click(confirmBtn);
    expect(
      screen.getByText('A reason is required to cancel this order.')
    ).toBeInTheDocument();
    expect(handleConfirm).not.toHaveBeenCalled();

    // Type a valid reason and confirm
    await user.type(reasonInput, 'Produce harvest delayed due to rainfall');
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith(
      'Produce harvest delayed due to rainfall',
      expect.anything()
    );
  });

  it('supports controlled cancellation reason value and onChange', async () => {
    const handleReasonChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        requireReason={true}
        reasonValue="Pre-filled reason"
        onReasonChange={handleReasonChange}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const reasonInput = screen.getByTestId('confirm-dialog-reason-input');
    expect(reasonInput).toHaveValue('Pre-filled reason');

    await user.type(reasonInput, ' extra');
    expect(handleReasonChange).toHaveBeenCalled();
  });

  it('renders override confirmation with primary variant', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        type="primary"
        title="Override Marketplace Settings"
        message="Applying this override will immediately enable direct bank transfers."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(
      screen.getByText('Override Marketplace Settings')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Applying this override will immediately enable direct bank transfers.'
      )
    ).toBeInTheDocument();
    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button');
    expect(confirmBtn).toHaveClass('btn-primary');
  });

  it('disables cancel and close actions and shows loading spinner when loading is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        loading={true}
        loadingText="Deleting..."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel-button');
    expect(cancelBtn).toBeDisabled();

    const confirmBtn = screen.getByTestId('confirm-dialog-confirm-button');
    expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Deleting...')).toBeInTheDocument();

    // Close button should be hidden during loading
    expect(
      screen.queryByTestId('confirm-dialog-close-button')
    ).not.toBeInTheDocument();
  });

  it('hides the variant icon when icon={false}', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        icon={false}
        title="No Icon Dialog"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByTestId('confirm-dialog-icon')).not.toBeInTheDocument();
  });
});

describe('Modal Utility Functions (getFocusableElements & handleTabFocusTrap)', () => {
  it('identifies focusable elements and ignores disabled elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <button id="btn-disabled" disabled>Disabled</button>
      <a id="link1" href="/test">Link</a>
      <div tabindex="0" id="div1">Div</div>
      <div tabindex="-1" id="div-unreachable">Not reachable</div>
    `;
    document.body.appendChild(container);

    const elements = getFocusableElements(container);
    const ids = elements.map((el) => el.id);

    expect(ids).toContain('btn1');
    expect(ids).toContain('input1');
    expect(ids).toContain('link1');
    expect(ids).toContain('div1');
    expect(ids).not.toContain('btn-disabled');
    expect(ids).not.toContain('div-unreachable');

    document.body.removeChild(container);
  });

  it('traps tab focus within container wrapping from last to first and vice versa', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button id="first">First</button>
      <button id="last">Last</button>
    `;
    document.body.appendChild(container);

    const first = container.querySelector('#first');
    const last = container.querySelector('#last');

    // Forward Tab from last element wraps to first
    last.focus();
    expect(document.activeElement).toBe(last);

    const forwardEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const handledForward = handleTabFocusTrap(forwardEvent, container);
    expect(handledForward).toBe(true);
    expect(document.activeElement).toBe(first);

    // Backward Shift+Tab from first element wraps to last
    first.focus();
    expect(document.activeElement).toBe(first);

    const backwardEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const handledBackward = handleTabFocusTrap(backwardEvent, container);
    expect(handledBackward).toBe(true);
    expect(document.activeElement).toBe(last);

    document.body.removeChild(container);
  });

  it('exports expected CONFIRM_DIALOG_VARIANTS', () => {
    expect(CONFIRM_DIALOG_VARIANTS).toEqual({
      DANGER: 'danger',
      WARNING: 'warning',
      PRIMARY: 'primary',
      INFO: 'info',
    });
  });
});
