import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  LazyImage,
  ImageWithPlaceholder,
  VegetablePlaceholder,
} from '../LazyImage';
import {
  isValidImageUrl,
  parseAspectRatio,
  getOptimizedImageUrl,
  IMAGE_BUDGETS,
} from '../../../utils/image.js';

describe('LazyImage Component (FE-039, NFR-PERF-03, NFR-COMP-03, SEL-05)', () => {
  const sampleSrc =
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea';
  const sampleAlt = 'Fresh Tomatoes';

  let originalIntersectionObserver;
  let observerInstances = [];

  beforeEach(() => {
    observerInstances = [];
    originalIntersectionObserver = window.IntersectionObserver;

    // Controllable IntersectionObserver mock for tests
    window.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      const instance = {
        callback,
        elements: new Set(),
        observe: vi.fn((el) => {
          instance.elements.add(el);
        }),
        unobserve: vi.fn((el) => {
          instance.elements.delete(el);
        }),
        disconnect: vi.fn(() => {
          instance.elements.clear();
        }),
        triggerIntersect: (isIntersecting = true) => {
          instance.callback([
            { isIntersecting, target: Array.from(instance.elements)[0] },
          ]);
        },
      };
      observerInstances.push(instance);
      return instance;
    });
  });

  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it('renders shimmer skeleton placeholder and observes element when lazy (NFR-PERF-03)', () => {
    render(
      <LazyImage
        src={sampleSrc}
        alt={sampleAlt}
        testId="test-lazy-img"
        aspectRatio="4/3"
      />
    );

    // Skeleton shimmer is displayed
    expect(screen.getByTestId('test-lazy-img-skeleton')).toBeInTheDocument();
    expect(window.IntersectionObserver).toHaveBeenCalled();
    expect(screen.queryByTestId('test-lazy-img-img')).not.toBeInTheDocument();

    // Trigger intersection
    act(() => {
      observerInstances[0].triggerIntersect(true);
    });

    // Image tag is now rendered
    const img = screen.getByTestId('test-lazy-img-img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleSrc);
    expect(img).toHaveAttribute('alt', sampleAlt);
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('supports priority={true} to eagerly load above-the-fold images (NFR-PERF-03)', () => {
    render(
      <LazyImage
        src={sampleSrc}
        alt={sampleAlt}
        priority={true}
        testId="priority-img"
      />
    );

    // Eagerly mounts img tag without waiting for observer
    const img = screen.getByTestId('priority-img-img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('transitions from loading state to loaded state on successful image load', () => {
    const handleLoad = vi.fn();

    render(
      <LazyImage
        src={sampleSrc}
        alt={sampleAlt}
        priority={true}
        onLoad={handleLoad}
        testId="load-transition"
      />
    );

    const img = screen.getByTestId('load-transition-img');
    expect(img).toHaveClass('lazy-image-img-loading');
    expect(screen.getByTestId('load-transition-skeleton')).toBeInTheDocument();

    // Fire image load
    fireEvent.load(img);

    expect(handleLoad).toHaveBeenCalledTimes(1);
    expect(img).toHaveClass('lazy-image-img-loaded');
    expect(
      screen.queryByTestId('load-transition-skeleton')
    ).not.toBeInTheDocument();
  });

  it('renders default VegetablePlaceholder when src is missing, null, or empty string (SEL-05)', () => {
    const { rerender } = render(
      <LazyImage src={null} alt="Organic Lettuce" testId="empty-img" />
    );

    expect(screen.getByTestId('empty-img')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-img-img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Organic Lettuce' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();

    // With empty string
    rerender(<LazyImage src="" alt="Organic Lettuce" testId="empty-img" />);
    expect(screen.queryByTestId('empty-img-img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Organic Lettuce' })
    ).toBeInTheDocument();

    // With whitespace only
    rerender(<LazyImage src="   " alt="Organic Lettuce" testId="empty-img" />);
    expect(screen.queryByTestId('empty-img-img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Organic Lettuce' })
    ).toBeInTheDocument();
  });

  it('renders default VegetablePlaceholder when image fails to load (NFR-COMP-03, SEL-05)', () => {
    const handleError = vi.fn();

    render(
      <LazyImage
        src="https://invalid.example.com/not-found.jpg"
        alt="Broken Vegetable"
        priority={true}
        onError={handleError}
        testId="error-img"
      />
    );

    const img = screen.getByTestId('error-img-img');
    expect(img).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(img);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('error-img-img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Broken Vegetable' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
  });

  it('preserves layout and aspect ratio whether loading, loaded, or in error (NFR-COMP-03, NFR-PERF-01)', () => {
    const { rerender } = render(
      <LazyImage
        src={sampleSrc}
        alt="Aspect Test"
        aspectRatio="16/9"
        width={320}
        priority={true}
        testId="aspect-test"
      />
    );

    const container = screen.getByTestId('aspect-test');
    expect(container).toHaveStyle({
      aspectRatio: '16/9',
      width: '320px',
      position: 'relative',
      overflow: 'hidden',
    });

    // Fail image and ensure container still preserves aspect-ratio and width
    const img = screen.getByTestId('aspect-test-img');
    fireEvent.error(img);

    expect(container).toHaveStyle({
      aspectRatio: '16/9',
      width: '320px',
    });

    // Rerender with custom ratio '1/1'
    rerender(
      <LazyImage
        src={null}
        alt="Square Produce"
        aspectRatio="1/1"
        width="100%"
        testId="aspect-test"
      />
    );

    expect(container).toHaveStyle({
      aspectRatio: '1/1',
      width: '100%',
    });
  });

  it('supports custom fallback ReactNode when image fails or is missing', () => {
    render(
      <LazyImage
        src={null}
        alt="Custom Fallback Test"
        fallback={
          <div data-testid="custom-produce-fallback">🥬 Fresh Greens</div>
        }
        testId="custom-fallback-img"
      />
    );

    expect(screen.getByTestId('custom-produce-fallback')).toBeInTheDocument();
    expect(screen.getByText('🥬 Fresh Greens')).toBeInTheDocument();
    expect(
      screen.queryByTestId('lazy-image-placeholder')
    ).not.toBeInTheDocument();
  });

  it('attempts fallbackSrc before falling back to placeholder SVG', () => {
    const backupSrc = 'https://images.unsplash.com/backup-photo';

    render(
      <LazyImage
        src="https://primary.example.com/error.jpg"
        fallbackSrc={backupSrc}
        alt="Fallback Src Test"
        priority={true}
        testId="fallback-src-img"
      />
    );

    const img = screen.getByTestId('fallback-src-img-img');
    expect(img).toHaveAttribute('src', 'https://primary.example.com/error.jpg');

    // First error: switches to fallbackSrc
    fireEvent.error(img);

    expect(img).toHaveAttribute('src', backupSrc);

    // Second error: fallbackSrc also fails, falls back to VegetablePlaceholder
    fireEvent.error(img);

    expect(
      screen.queryByTestId('fallback-src-img-img')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
  });

  it('supports custom placeholder component while loading', () => {
    render(
      <LazyImage
        src={sampleSrc}
        alt="Custom Placeholder"
        placeholder={<div data-testid="custom-spinner">Loading carrot...</div>}
        testId="custom-placeholder-img"
      />
    );

    expect(screen.getByTestId('custom-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading carrot...')).toBeInTheDocument();
  });

  it('supports showAltOnFallback to visually display the produce name on placeholder', () => {
    render(
      <LazyImage
        src={null}
        alt="Sweet Sweet Potatoes"
        showAltOnFallback={true}
        testId="labeled-placeholder"
      />
    );

    expect(screen.getByText('Sweet Sweet Potatoes')).toBeInTheDocument();
  });

  it('supports custom fit, position, borderRadius, and styling props', () => {
    render(
      <LazyImage
        src={sampleSrc}
        alt="Style Test"
        fit="contain"
        position="top center"
        borderRadius="16px"
        priority={true}
        className="custom-container-class"
        imgClassName="custom-img-class"
        style={{ margin: '10px' }}
        testId="style-test"
      />
    );

    const container = screen.getByTestId('style-test');
    expect(container).toHaveClass('custom-container-class');
    expect(container).toHaveStyle({ borderRadius: '16px', margin: '10px' });

    const img = screen.getByTestId('style-test-img');
    expect(img).toHaveClass('custom-img-class');
    expect(img).toHaveStyle({
      objectFit: 'contain',
      objectPosition: 'top center',
    });
  });

  it('handles click events on container', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <LazyImage
        src={sampleSrc}
        alt="Clickable Image"
        priority={true}
        onClick={handleClick}
        testId="clickable-img"
      />
    );

    await user.click(screen.getByTestId('clickable-img'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('passes responsive srcSet and sizes props to the img element (NFR-PERF-03)', () => {
    const srcSet = `${sampleSrc}?w=300 300w, ${sampleSrc}?w=600 600w`;
    const sizes = '(max-width: 600px) 100vw, 50vw';

    render(
      <LazyImage
        src={sampleSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt="Responsive Produce"
        priority={true}
        testId="responsive-img"
      />
    );

    const img = screen.getByTestId('responsive-img-img');
    expect(img).toHaveAttribute('srcset', srcSet);
    expect(img).toHaveAttribute('sizes', sizes);
  });

  it('ImageWithPlaceholder alias component works identically', () => {
    render(
      <ImageWithPlaceholder src={null} alt="Alias Test" testId="alias-img" />
    );

    expect(screen.getByTestId('alias-img')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alias Test' })).toBeInTheDocument();
  });

  it('VegetablePlaceholder renders standalone SVG produce icon with role="img"', () => {
    render(
      <VegetablePlaceholder alt="Fresh Veggie" showLabel={true} iconSize={64} />
    );

    const placeholder = screen.getByRole('img', { name: 'Fresh Veggie' });
    expect(placeholder).toBeInTheDocument();
    expect(screen.getByText('Fresh Veggie')).toBeInTheDocument();
  });

  it('falls back gracefully to eager load when window.IntersectionObserver is unsupported', () => {
    // Delete IntersectionObserver from window
    const originalObserver = window.IntersectionObserver;
    delete window.IntersectionObserver;

    try {
      render(
        <LazyImage
          src={sampleSrc}
          alt="No Observer Test"
          testId="no-observer"
        />
      );

      // Should automatically mount img without observer
      expect(screen.getByTestId('no-observer-img')).toBeInTheDocument();
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });
});

describe('Image Utility Functions (NFR-PERF-03, SEL-05)', () => {
  it('validates image URLs correctly via isValidImageUrl', () => {
    expect(isValidImageUrl('https://example.com/img.jpg')).toBe(true);
    expect(isValidImageUrl('/images/produce.webp')).toBe(true);
    expect(isValidImageUrl('')).toBe(false);
    expect(isValidImageUrl('   ')).toBe(false);
    expect(isValidImageUrl(null)).toBe(false);
    expect(isValidImageUrl(undefined)).toBe(false);
    expect(isValidImageUrl(123)).toBe(false);
    expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
  });

  it('parses aspect ratios properly via parseAspectRatio', () => {
    expect(parseAspectRatio('4/3')).toBe('4/3');
    expect(parseAspectRatio('16 / 9')).toBe('16/9');
    expect(parseAspectRatio('1/1')).toBe('1/1');
    expect(parseAspectRatio('1.77')).toBe('1.77');
    expect(parseAspectRatio(1.5)).toBe('1.5');
    expect(parseAspectRatio('auto')).toBeUndefined();
    expect(parseAspectRatio('')).toBeUndefined();
    expect(parseAspectRatio(null)).toBeUndefined();
  });

  it('constructs optimized image URLs via getOptimizedImageUrl (NFR-PERF-03)', () => {
    const base = 'https://example.com/photo.jpg';
    const optimized = getOptimizedImageUrl(base, {
      width: 300,
      height: 200,
      quality: 80,
    });
    expect(optimized).toContain('w=300');
    expect(optimized).toContain('h=200');
    expect(optimized).toContain('q=80');

    // Without options returns unchanged
    expect(getOptimizedImageUrl(base)).toBe(base);
    expect(getOptimizedImageUrl(null)).toBe('');
  });

  it('exposes SRS performance and upload budgets', () => {
    expect(IMAGE_BUDGETS.THUMBNAIL_MAX_KB).toBe(100);
    expect(IMAGE_BUDGETS.DETAIL_MAX_KB).toBe(300);
    expect(IMAGE_BUDGETS.UPLOAD_MAX_MB).toBe(2);
    expect(IMAGE_BUDGETS.ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(IMAGE_BUDGETS.ALLOWED_MIME_TYPES).toContain('image/png');
    expect(IMAGE_BUDGETS.ALLOWED_MIME_TYPES).toContain('image/webp');
  });
});
