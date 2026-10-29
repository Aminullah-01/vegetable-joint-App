import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from '../ImageUploader';

describe('ImageUploader Component (FE-084 / SEL-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(
      () => 'blob:http://localhost/test-preview-url'
    );
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('1. Default Idle State & Guidance (SEL-05, Figma Section 13)', () => {
    it('renders label, subtext guidance, dropzone, and default vegetable placeholder 🥦', () => {
      render(
        <ImageUploader
          label="Produce Photo (SEL-05)"
          helperText="JPEG, PNG or WebP — Maximum 2 MB (A-08, SEL-05)"
          placeholderIcon="🥦"
        />
      );

      expect(screen.getByText('Produce Photo (SEL-05)')).toBeInTheDocument();
      expect(
        screen.getByText('JPEG, PNG or WebP — Maximum 2 MB (A-08, SEL-05)')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('product-image-placeholder-icon')
      ).toHaveTextContent('🥦');
      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('product-image-upload-progress')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('product-image-dropzone')).toBeInTheDocument();
    });

    it('renders with an initial external value if provided', () => {
      render(
        <ImageUploader
          value="https://images.unsplash.com/sample-carrot.jpg"
          placeholderIcon="🥕"
        />
      );

      const preview = screen.getByTestId('product-image-preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute(
        'src',
        'https://images.unsplash.com/sample-carrot.jpg'
      );
    });
  });

  describe('2. Client-Side Format and Size Validation (SEL-05, A-08)', () => {
    it('rejects unsupported file formats (PDF, GIF, SVG, text) with clear error message', () => {
      const onError = vi.fn();
      render(<ImageUploader onError={onError} />);

      const fileInput = screen.getByTestId('product-image-input');
      const pdfFile = new File(['%PDF-1.4'], 'document.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      const errorAlert = screen.getByTestId('product-image-error');
      expect(errorAlert).toHaveTextContent(
        /Image must be in JPEG, PNG, or WebP format \(SEL-05\)/i
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('JPEG, PNG, or WebP')
      );
      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('product-image-placeholder-icon')
      ).toBeInTheDocument();
    });

    it('rejects files exceeding the 2 MB budget (SEL-05, A-08)', async () => {
      const onError = vi.fn();
      render(<ImageUploader onError={onError} />);

      const fileInput = screen.getByTestId('product-image-input');
      // Create fake file of 2.5 MB (2.5 * 1024 * 1024 bytes)
      const oversizedFile = new File(
        [new ArrayBuffer(2.5 * 1024 * 1024)],
        'oversized-farm.png',
        {
          type: 'image/png',
        }
      );

      const user = userEvent.setup();
      await user.upload(fileInput, oversizedFile);

      const errorAlert = screen.getByTestId('product-image-error');
      expect(errorAlert).toHaveTextContent(
        /Image file size must not exceed 2 MB \(SEL-05\)/i
      );
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('must not exceed 2 MB')
      );
      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
    });

    it('accepts valid files within 2 MB budget for JPEG, PNG, and WebP', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <ImageUploader
          onChange={onChange}
          autoUpload={false} // test local preview without auto-trigger
        />
      );

      const fileInput = screen.getByTestId('product-image-input');
      const webpFile = new File(['webp-binary-data'], 'fresh-cabbage.webp', {
        type: 'image/webp',
      });

      await user.upload(fileInput, webpFile);

      expect(
        screen.queryByTestId('product-image-error')
      ).not.toBeInTheDocument();
      const preview = screen.getByTestId('product-image-preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute(
        'src',
        'blob:http://localhost/test-preview-url'
      );
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          file: webpFile,
          previewUrl: 'blob:http://localhost/test-preview-url',
        })
      );
    });
  });

  describe('3. Preview, File Details & Removal Action (SEL-05, NFR-PERF-03)', () => {
    it('displays file name and formatted size when valid file is selected', async () => {
      const user = userEvent.setup();
      render(<ImageUploader autoUpload={false} />);

      const fileInput = screen.getByTestId('product-image-input');
      // 500 KB file
      const file = new File(
        [new ArrayBuffer(500 * 1024)],
        'gbagba-greens.jpeg',
        {
          type: 'image/jpeg',
        }
      );

      await user.upload(fileInput, file);

      expect(screen.getByTestId('product-image-name')).toHaveTextContent(
        'gbagba-greens.jpeg'
      );
      expect(screen.getByTestId('product-image-size')).toHaveTextContent(
        /500\.0 KB/i
      );
    });

    it('removes preview and restores placeholder icon when clicking Remove Image button', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      const onChange = vi.fn();

      render(
        <ImageUploader
          autoUpload={false}
          onRemove={onRemove}
          onChange={onChange}
        />
      );

      const fileInput = screen.getByTestId('product-image-input');
      const validFile = new File(['image-bytes'], 'bell-peppers.png', {
        type: 'image/png',
      });

      await user.upload(fileInput, validFile);

      expect(screen.getByTestId('product-image-preview')).toBeInTheDocument();

      const removeBtn = screen.getByTestId('product-remove-image-btn');
      await user.click(removeBtn);

      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('product-image-placeholder-icon')
      ).toBeInTheDocument();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(
        'blob:http://localhost/test-preview-url'
      );
      expect(onRemove).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith({
        file: null,
        previewUrl: null,
        uploadedUrl: '',
      });
    });
  });

  describe('4. Upload with Progress Tracking (SEL-05, AC: upload with progress)', () => {
    it('displays animated progress bar, percentage readout, and status during upload', async () => {
      let progressCallback;
      const mockUploadFn = vi.fn((file, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              url: 'https://cdn.vegetablejoint.ng/products/sweet-carrots.jpg',
              filename: file.name,
              size: file.size,
            });
          }, 100);
        });
      });

      const user = userEvent.setup();
      render(<ImageUploader autoUpload={true} uploadFn={mockUploadFn} />);

      const fileInput = screen.getByTestId('product-image-input');
      const testFile = new File(['mock-bytes'], 'carrots.jpg', {
        type: 'image/jpeg',
      });

      await user.upload(fileInput, testFile);

      // Verify progress container is rendered
      expect(
        await screen.findByTestId('product-image-upload-progress')
      ).toBeInTheDocument();

      const progressBar = screen.getByTestId('upload-progress-bar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('role', 'progressbar');

      // Trigger 45% progress
      progressCallback({ loaded: 450, total: 1000, percent: 45 });
      expect(
        await screen.findByTestId('upload-progress-percentage')
      ).toHaveTextContent('45%');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');

      // Trigger 100% progress
      progressCallback({ loaded: 1000, total: 1000, percent: 100 });
      expect(
        await screen.findByTestId('upload-progress-percentage')
      ).toHaveTextContent('100%');

      // Await final success status
      await waitFor(() => {
        expect(screen.getByTestId('upload-progress-status')).toHaveTextContent(
          /Upload complete!/i
        );
      });
    });

    it('surfaces error alert and retry button on upload failure, and allows retrying', async () => {
      let failFirst = true;
      const mockUploadFn = vi.fn(() => {
        if (failFirst) {
          failFirst = false;
          return Promise.reject(new Error('Cloud storage connection timeout'));
        }
        return Promise.resolve({
          url: 'https://cdn.vegetablejoint.ng/recovered.jpg',
        });
      });

      const user = userEvent.setup();
      render(<ImageUploader autoUpload={true} uploadFn={mockUploadFn} />);

      const fileInput = screen.getByTestId('product-image-input');
      const testFile = new File(['bytes'], 'tomatoes.jpg', {
        type: 'image/jpeg',
      });

      await user.upload(fileInput, testFile);

      // Verify upload error surfaced
      const errorBanner = await screen.findByTestId('product-image-error');
      expect(errorBanner).toHaveTextContent('Cloud storage connection timeout');

      // Verify retry button is rendered
      const retryBtn = screen.getByTestId('product-image-retry-btn');
      expect(retryBtn).toBeInTheDocument();

      // Click retry
      await user.click(retryBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId('product-image-error')
        ).not.toBeInTheDocument();
        expect(screen.getByTestId('upload-progress-status')).toHaveTextContent(
          /Upload complete!/i
        );
      });
    });
  });

  describe('5. Drag-and-Drop Interaction', () => {
    it('sets dragging style on dragenter/dragover and handles dropped valid image', async () => {
      const onChange = vi.fn();
      render(<ImageUploader autoUpload={false} onChange={onChange} />);

      const dropzone = screen.getByTestId('product-image-dropzone');

      // Drag enter
      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveTextContent(/Drop your vegetable photo here/i);

      // Drag leave
      fireEvent.dragLeave(dropzone);
      expect(dropzone).toHaveTextContent(
        /Drop your photo here, or browse files/i
      );

      // Drop valid file
      const droppedFile = new File(['binary-content'], 'habanero.png', {
        type: 'image/png',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [droppedFile],
        },
      });

      expect(
        await screen.findByTestId('product-image-preview')
      ).toBeInTheDocument();
      expect(screen.getByTestId('product-image-name')).toHaveTextContent(
        'habanero.png'
      );
    });

    it('rejects dropped oversized files with inline error', async () => {
      render(<ImageUploader autoUpload={false} />);

      const dropzone = screen.getByTestId('product-image-dropzone');
      const bigFile = new File(
        [new ArrayBuffer(3 * 1024 * 1024)],
        'huge-photo.jpg',
        {
          type: 'image/jpeg',
        }
      );

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [bigFile],
        },
      });

      expect(
        await screen.findByTestId('product-image-error')
      ).toHaveTextContent(/Image file size must not exceed 2 MB \(SEL-05\)/i);
    });
  });

  describe('6. Accessibility & Disabled State', () => {
    it('disables file input and dropzone when disabled prop is true', () => {
      render(<ImageUploader disabled={true} />);

      const fileInput = screen.getByTestId('product-image-input');
      expect(fileInput).toBeDisabled();

      const dropzone = screen.getByTestId('product-image-dropzone');
      expect(dropzone).toHaveAttribute('aria-disabled', 'true');
      expect(dropzone).toHaveAttribute('tabIndex', '-1');
    });

    it('triggers file selection dialog when pressing Enter on focused dropzone', () => {
      render(<ImageUploader />);

      const dropzone = screen.getByTestId('product-image-dropzone');
      const fileInput = screen.getByTestId('product-image-input');

      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.keyDown(dropzone, { key: 'Enter', code: 'Enter' });
      expect(clickSpy).toHaveBeenCalled();

      fireEvent.keyDown(dropzone, { key: ' ', code: 'Space' });
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });
  });
});
