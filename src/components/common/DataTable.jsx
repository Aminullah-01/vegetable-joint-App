import { useState } from 'react';
import PropTypes from 'prop-types';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { STRINGS } from '../../constants';

/**
 * Helper to extract cell value from row and column definition
 */
function getCellValue(row, column, index) {
  if (typeof column.render === 'function') {
    return column.render(row, index);
  }
  if (column.accessor) {
    if (typeof column.accessor === 'function') {
      return column.accessor(row, index);
    }
    return row[column.accessor] ?? null;
  }
  return null;
}

/**
 * Checks if a column is designated as an action column
 */
function isActionColumn(column) {
  if (column.isAction === true) return true;
  const key = (column.key || column.id || '').toLowerCase();
  return key === 'actions' || key === 'action';
}

/**
 * DataTable — Responsive Data Table Component
 * SRS References: NFR-USAB-06 (Tablets horizontal scroll or responsive cards, no clipped actions),
 * NFR-USAB-02 (WCAG 2.1 AA Accessibility), NFR-USAB-03 (Touch targets ≥ 44×44px)
 *
 * Supports:
 * - 'responsive' mode: table on desktop/laptop, transforms into structured cards on tablet/mobile (<= 768px)
 * - 'scroll' mode: table view with horizontal scrolling and no clipped action buttons
 * - 'cards' mode: card view on all screen sizes
 * - Optional manual view toggle (Table <-> Cards) for user preference
 * - Integrated TableSkeleton loading state
 * - Integrated EmptyState when no records match
 * - Pagination footer slot
 * - Accessible table markup (scope="col", captions, aria-labels)
 */
export function DataTable({
  columns = [],
  data = [],
  keyExtractor,
  rowKey = 'id',
  loading = false,
  loadingRows = 5,
  emptyState,
  emptyTitle,
  emptyDescription,
  title,
  subtitle,
  toolbar,
  pagination,
  responsiveMode = 'responsive',
  allowViewToggle = false,
  hoverable = true,
  striped = false,
  caption,
  ariaLabel,
  onRowClick,
  renderCard,
  className = '',
  testId = 'data-table',
}) {
  const [activeView, setActiveView] = useState(
    responsiveMode === 'cards' ? 'cards' : 'table'
  );

  const getRowKey = (row, index) => {
    if (typeof keyExtractor === 'function') {
      return keyExtractor(row, index);
    }
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }
    return row[rowKey] ?? row.id ?? row.key ?? index;
  };

  const isInteractiveRow = typeof onRowClick === 'function';

  // Toggle view handler
  const handleToggleView = () => {
    setActiveView((prev) => (prev === 'table' ? 'cards' : 'table'));
  };

  // Determine effective display mode
  // If allowViewToggle is on and user manually switched, honor activeView.
  // Otherwise honor responsiveMode ('responsive', 'scroll', 'cards').
  const effectiveMode = allowViewToggle ? activeView : responsiveMode;

  const renderTableSection = () => (
    <div
      className="data-table-scroll"
      data-testid={`${testId}-scroll-container`}
      tabIndex="0"
      role="region"
      aria-label={ariaLabel || caption || 'Data table'}
    >
      <table
        className={`data-table ${hoverable ? 'data-table-hover' : ''} ${
          striped ? 'data-table-striped' : ''
        }`.trim()}
        data-testid={`${testId}-table`}
      >
        {caption && (
          <caption
            style={{
              textAlign: 'left',
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((col, cIdx) => {
              const colKey = col.key || col.id || cIdx;
              const alignment =
                col.align || (isActionColumn(col) ? 'right' : 'left');

              return (
                <th
                  key={colKey}
                  scope="col"
                  style={{
                    textAlign: alignment,
                    width: col.width,
                    ...col.headerStyle,
                  }}
                  className={col.headerClassName || ''}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => {
            const rowIdentifier = getRowKey(row, rIdx);

            return (
              <tr
                key={rowIdentifier}
                data-testid={`${testId}-row-${rIdx}`}
                onClick={
                  isInteractiveRow ? () => onRowClick(row, rIdx) : undefined
                }
                onKeyDown={
                  isInteractiveRow
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row, rIdx);
                        }
                      }
                    : undefined
                }
                tabIndex={isInteractiveRow ? 0 : undefined}
                role={isInteractiveRow ? 'button' : undefined}
                style={{
                  cursor: isInteractiveRow ? 'pointer' : 'default',
                  outline: 'none',
                }}
              >
                {columns.map((col, cIdx) => {
                  const colKey = col.key || col.id || cIdx;
                  const alignment =
                    col.align || (isActionColumn(col) ? 'right' : 'left');
                  const cellContent = getCellValue(row, col, rIdx);

                  return (
                    <td
                      key={colKey}
                      style={{
                        textAlign: alignment,
                        ...col.cellStyle,
                      }}
                      className={col.cellClassName || ''}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCardsSection = () => (
    <div
      className="data-table-cards-list"
      data-testid={`${testId}-cards-container`}
      role="list"
    >
      {data.map((row, rIdx) => {
        const rowIdentifier = getRowKey(row, rIdx);

        if (typeof renderCard === 'function') {
          return (
            <div key={rowIdentifier} role="listitem">
              {renderCard(row, rIdx, columns)}
            </div>
          );
        }

        const regularCols = columns.filter(
          (col) => !isActionColumn(col) && !col.hideOnMobile
        );
        const actionCols = columns.filter((col) => isActionColumn(col));

        return (
          <div
            key={rowIdentifier}
            role="listitem"
            data-testid={`${testId}-card-${rIdx}`}
            className="data-table-card"
            onClick={isInteractiveRow ? () => onRowClick(row, rIdx) : undefined}
            style={{
              cursor: isInteractiveRow ? 'pointer' : 'default',
            }}
          >
            {regularCols.map((col, cIdx) => {
              const colKey = col.key || col.id || cIdx;
              const cellContent = getCellValue(row, col, rIdx);

              return (
                <div key={colKey} className="data-table-card-row">
                  <span className="data-table-card-label">{col.header}</span>
                  <span className="data-table-card-value">{cellContent}</span>
                </div>
              );
            })}

            {actionCols.length > 0 && (
              <div
                className="data-table-card-actions"
                data-testid={`${testId}-card-actions-${rIdx}`}
                onClick={(e) => e.stopPropagation()}
              >
                {actionCols.map((col, cIdx) => {
                  const colKey = col.key || col.id || cIdx;
                  return <div key={colKey}>{getCellValue(row, col, rIdx)}</div>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`data-table-container ${
        effectiveMode === 'responsive' ? 'data-table-responsive-auto' : ''
      } ${className}`.trim()}
      data-testid={testId}
    >
      {/* Header & Toolbar */}
      {(title || subtitle || toolbar || allowViewToggle) && (
        <div
          data-testid={`${testId}-header`}
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            {toolbar}

            {allowViewToggle && (
              <button
                type="button"
                onClick={handleToggleView}
                aria-label={STRINGS.TABLE?.TOGGLE_VIEW || 'Switch view mode'}
                data-testid={`${testId}-view-toggle`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minHeight: '44px',
                  minWidth: '44px',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {activeView === 'table' ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span>{STRINGS.TABLE?.VIEW_AS_CARDS || 'Card View'}</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M3 12h18M3 18h18" />
                    </svg>
                    <span>{STRINGS.TABLE?.VIEW_AS_TABLE || 'Table View'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Loading | Empty | Data View */}
      {loading ? (
        <div style={{ padding: '1rem' }} data-testid={`${testId}-loading`}>
          <TableSkeleton rows={loadingRows} columns={columns.length} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '2rem 1rem' }} data-testid={`${testId}-empty`}>
          {emptyState || (
            <EmptyState
              title={
                emptyTitle || STRINGS.TABLE?.EMPTY_TITLE || 'No records found'
              }
              description={
                emptyDescription ||
                STRINGS.TABLE?.EMPTY_DESCRIPTION ||
                'There are no items or data records to display.'
              }
              compact
            />
          )}
        </div>
      ) : (
        <>
          {effectiveMode === 'responsive' && (
            <>
              <div className="data-table-desktop-view">
                {renderTableSection()}
              </div>
              <div className="data-table-cards-view">
                {renderCardsSection()}
              </div>
            </>
          )}

          {(effectiveMode === 'scroll' || effectiveMode === 'table') &&
            renderTableSection()}

          {effectiveMode === 'cards' && renderCardsSection()}
        </>
      )}

      {/* Pagination Footer */}
      {pagination && (
        <div
          data-testid={`${testId}-pagination`}
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {pagination}
        </div>
      )}
    </div>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      id: PropTypes.string,
      header: PropTypes.node.isRequired,
      accessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      render: PropTypes.func,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      width: PropTypes.string,
      hideOnMobile: PropTypes.bool,
      isAction: PropTypes.bool,
      headerStyle: PropTypes.object,
      headerClassName: PropTypes.string,
      cellStyle: PropTypes.object,
      cellClassName: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  keyExtractor: PropTypes.func,
  rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  loading: PropTypes.bool,
  loadingRows: PropTypes.number,
  emptyState: PropTypes.node,
  emptyTitle: PropTypes.string,
  emptyDescription: PropTypes.string,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  toolbar: PropTypes.node,
  pagination: PropTypes.node,
  responsiveMode: PropTypes.oneOf(['responsive', 'scroll', 'cards']),
  allowViewToggle: PropTypes.bool,
  hoverable: PropTypes.bool,
  striped: PropTypes.bool,
  caption: PropTypes.string,
  ariaLabel: PropTypes.string,
  onRowClick: PropTypes.func,
  renderCard: PropTypes.func,
  className: PropTypes.string,
  testId: PropTypes.string,
};

export default DataTable;
