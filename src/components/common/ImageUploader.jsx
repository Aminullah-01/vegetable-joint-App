import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  validateProductImage,
  IMAGE_BUDGETS,
  formatFileSize,
} from '../../utils/image.js';
import { sellerService } from '../../services/sellerService.js';

/**
 * ImageUploader Component — Accessible file drag-and-drop & progress uploader
 *
 * SRS References:
 * - SEL-05 / A-08: Supported formats JPEG, PNG, WebP; Max size ≤ 2 MB; default placeholder fallback.
 * - UI-05 / NFR-USAB-05: Real-time client-side validation, accessible alerts, inline errors.
 * - NFR-PERF-03: Thumbnail preview generation.
 * - Figma Section 13 & Form Components: File/image uploader supporting default, dragover, filled, error, progress, success.
 */
export function ImageUploader({
  id = 'product-image-file',
  label = 'Product Image (SEL-05)',
  helperText = 'JPEG, PNG or WebP — Maximum 2 MB (A-08, SEL-05)',
  value = '',
  onChange,
  onRemove,
  onError,
  onUploadComplete,
  disabled = false,
  autoUpload = true,
  uploadFn,
  placeholderIcon = '🥦',
  testId = 'product-image',
  externalError = null,
}) {
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Compute active preview: local selection takes precedence, then external value
  const previewUrl =
    localPreviewUrl !== null ? localPreviewUrl || null : value || null;

  // Clean up created object URLs on unmount
  useEffect(() => {
    return () => {
      if (
        localPreviewUrl &&
        typeof localPreviewUrl === 'string' &&
        localPreviewUrl.startsWith('blob:')
      ) {
        try {
          URL.revokeObjectURL(localPreviewUrl);
        } catch {
          // Ignore revocation errors in mock environments
        }
      }
    };
  }, [localPreviewUrl]);

  const activeError = externalError || uploadError;

  /**
   * Performs the upload operation with progress callbacks
   */
  const executeUpload = useCallback(
    async (file, objectUrl) => {
      uploadAbortRef.current = false;
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setIsSuccess(false);

      const performUpload = uploadFn || sellerService.uploadProductImage;

      try {
        const result = await performUpload(file, ({ percent }) => {
          if (!uploadAbortRef.current) {
            setUploadProgress(percent);
          }
        });

        if (uploadAbortRef.current) {
          return null;
        }

        setIsUploading(false);
        setUploadProgress(100);
        setIsSuccess(true);

        const uploadedUrl = result?.url || objectUrl;
        if (typeof onUploadComplete === 'function') {
          onUploadComplete(result);
        }
        if (typeof onChange === 'function') {
          onChange({
            file,
            previewUrl: objectUrl,
            uploadedUrl,
          });
        }
        return result;
      } catch (err) {
        if (uploadAbortRef.current) {
          return null;
        }
        setIsUploading(false);
        const errMsg =
          err?.message || 'Failed to upload product image. Please try again.';
        setUploadError(errMsg);
        if (typeof onError === 'function') {
          onError(errMsg);
        }
        throw err;
      }
    },
    [uploadFn, onUploadComplete, onChange, onError]
  );

  /**
   * Validates and processes a chosen or dropped file
   */
  const processFile = useCallback(
    (file) => {
      if (!file) return;

      // 1. Client-side check of file type and size (SEL-05, A-08)
      const validationError = validateProductImage(file);
      if (validationError) {
        setUploadError(validationError);
        setIsSuccess(false);
        if (typeof onError === 'function') {
          onError(validationError);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Clear any prior errors
      setUploadError(null);
      setSelectedFile(file);

      // 2. Generate local object preview URL
      let objectUrl = '';
      if (
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function'
      ) {
        try {
          objectUrl = URL.createObjectURL(file);
        } catch {
          objectUrl = '';
        }
      }
      setLocalPreviewUrl(objectUrl);

      // Notify parent of local preview
      if (typeof onChange === 'function') {
        onChange({
          file,
          previewUrl: objectUrl,
          uploadedUrl: objectUrl,
        });
      }

      // 3. Initiate upload with progress (SEL-05)
      if (autoUpload) {
        executeUpload(file, objectUrl).catch(() => {
          // Upload failure handled in executeUpload
        });
      }
    },
    [autoUpload, executeUpload, onChange, onError]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = () => {
    uploadAbortRef.current = true;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (
      previewUrl &&
      typeof previewUrl === 'string' &&
      previewUrl.startsWith('blob:')
    ) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }
    setLocalPreviewUrl('');
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setIsSuccess(false);

    if (typeof onRemove === 'function') {
      onRemove();
    }
    if (typeof onChange === 'function') {
      onChange({ file: null, previewUrl: null, uploadedUrl: '' });
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      executeUpload(selectedFile, previewUrl).catch(() => {});
    }
  };

  const handleDropzoneKeyDown = (e) => {
    if (disabled || isUploading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        opacity: disabled ? 0.65 : 1,
      }}
      data-testid={`${testId}-upload-section`}
    >
      {/* Label and Guidance */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <label
          htmlFor={id}
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          {helperText}
        </span>
      </div>

      {/* Interactive Dropzone / Upload Area */}
      <div
        tabIndex={disabled || isUploading ? -1 : 0}
        role="button"
        aria-label="Upload vegetable produce image"
        aria-disabled={disabled || isUploading}
        onKeyDown={handleDropzoneKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          // Ignore synthetic keyboard clicks (e.detail === 0) since handled by onKeyDown
          if (e.detail !== 0 && !disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        data-testid={`${testId}-dropzone`}
        style={{
          border: isDragging
            ? '2px dashed #15803d'
            : activeError
              ? '2px dashed #ef4444'
              : '2px dashed #cbd5e1',
          backgroundColor: isDragging
            ? '#f0fdf4'
            : activeError
              ? '#fef2f2'
              : '#ffffff',
          borderRadius: '8px',
          padding: '1rem',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease-in-out',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Hidden HTML File Input (SEL-05) */}
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          data-testid={`${testId}-input`}
          style={{ display: 'none' }}
        />

        {/* Thumbnail Preview or Fallback Placeholder Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Produce preview"
              data-testid={`${testId}-preview`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span
              data-testid={`${testId}-placeholder-icon`}
              style={{ fontSize: '2rem' }}
              aria-label="Default produce placeholder"
              role="img"
            >
              {placeholderIcon}
            </span>
          )}
        </div>

        {/* Dropzone Descriptive Copy & Actions */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          {selectedFile ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  wordBreak: 'break-all',
                }}
                data-testid={`${testId}-name`}
              >
                {selectedFile.name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
                data-testid={`${testId}-size`}
              >
                Size: {formatFileSize(selectedFile.size)} &bull;{' '}
                {selectedFile.type || 'image'}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#15803d',
                  fontWeight: 500,
                  marginTop: '0.2rem',
                }}
              >
                Click or drag another file to replace
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isDragging ? '#15803d' : '#334155',
                }}
              >
                {isDragging
                  ? 'Drop your vegetable photo here'
                  : 'Drop your photo here, or browse files'}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '0.25rem',
                }}
              >
                Supported formats: <strong>JPEG, PNG or WebP</strong> &bull; Max{' '}
                <strong>{IMAGE_BUDGETS.UPLOAD_MAX_MB} MB</strong>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.2rem',
                }}
              >
                If no image is uploaded, a default fresh vegetable placeholder
                will be used.
              </div>
            </div>
          )}
        </div>

        {/* Remove Preview Button */}
        {previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            disabled={disabled}
            data-testid="product-remove-image-btn"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              alignSelf: 'center',
            }}
          >
            🗑️ Remove Image
          </button>
        )}
      </div>

      {/* Upload Progress Bar (SEL-05, AC: upload with progress) */}
      {(isUploading || uploadProgress > 0) && (
        <div
          data-testid={`${testId}-upload-progress`}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
            }}
          >
            <span
              data-testid="upload-progress-status"
              style={{
                fontWeight: 600,
                color: isSuccess
                  ? '#15803d'
                  : uploadError
                    ? '#dc2626'
                    : '#0284c7',
              }}
            >
              {isUploading
                ? 'Uploading image to secure storage...'
                : isSuccess
                  ? 'Upload complete! ✅'
                  : uploadError
                    ? 'Upload failed ⚠️'
                    : 'Ready'}
            </span>
            <span
              data-testid="upload-progress-percentage"
              style={{
                fontWeight: 700,
                color: '#334155',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {uploadProgress}%
            </span>
          </div>

          {/* Accessible Progress Track */}
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="upload-progress-bar"
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Image upload progress"
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: isSuccess
                  ? '#16a34a'
                  : uploadError
                    ? '#ef4444'
                    : '#0284c7',
                borderRadius: '999px',
                transition: 'width 0.2s ease-in-out',
              }}
            />
          </div>
        </div>
      )}

      {/* Inline Client-Side & Server Error Display (SEL-05, UI-05) */}
      {activeError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '6px',
          }}
        >
          <span
            data-testid={`${testId}-error`}
            role="alert"
            style={{
              color: '#dc2626',
              fontSize: '0.825rem',
              fontWeight: 500,
            }}
          >
            ⚠️ {activeError}
          </span>

          {/* Retry Button if Upload Error */}
          {selectedFile && uploadError && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isUploading}
              data-testid={`${testId}-retry-btn`}
              style={{
                background: '#ffffff',
                border: '1px solid #dc2626',
                color: '#dc2626',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

ImageUploader.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onRemove: PropTypes.func,
  onError: PropTypes.func,
  onUploadComplete: PropTypes.func,
  disabled: PropTypes.bool,
  autoUpload: PropTypes.bool,
  uploadFn: PropTypes.func,
  placeholderIcon: PropTypes.string,
  testId: PropTypes.string,
  externalError: PropTypes.string,
};
