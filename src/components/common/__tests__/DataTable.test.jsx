import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../DataTable';

describe('DataTable Component (FE-037, NFR-USAB-06, NFR-USAB-02, NFR-USAB-03)', () => {
  const mockColumns = [
    {
      key: 'name',
      header: 'Product',
      accessor: 'name',
    },
    {
      key: 'price',
      header: 'Price',
      accessor: (row) => `₦${row.price.toLocaleString()}`,
    },
    {
      key: 'stock',
      header: 'Stock',
      accessor: 'stock',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <span data-testid="status-badge">{row.status}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      isAction: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => {}}
          aria-label={`Edit ${row.name}`}
        >
          Edit
        </button>
      ),
    },
  ];

  const mockData = [
    {
      id: 1,
      name: 'Fresh Ugwu',
      price: 1200,
      stock: '45 bunches',
      status: 'Available',
    },
    {
      id: 2,
      name: 'Roma Tomatoes',
      price: 8500,
      stock: '12 baskets',
      status: 'Low Stock',
    },
  ];

  it('renders standard table with proper accessible columns and rows', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        caption="Seller Vegetables"
        responsiveMode="scroll"
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Seller Vegetables')).toBeInTheDocument();

    // Headers
    expect(
      screen.getByRole('columnheader', { name: 'Product' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Price' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Stock' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Status' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Actions' })
    ).toBeInTheDocument();

    // Row contents
    expect(screen.getByText('Fresh Ugwu')).toBeInTheDocument();
    expect(screen.getByText('₦1,200')).toBeInTheDocument();
    expect(screen.getByText('45 bunches')).toBeInTheDocument();
    expect(screen.getByText('Roma Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('₦8,500')).toBeInTheDocument();
    expect(screen.getByText('12 baskets')).toBeInTheDocument();
  });

  it('renders horizontal scroll container to prevent clipped actions (NFR-USAB-06)', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        responsiveMode="scroll"
      />
    );

    const scrollContainer = screen.getByTestId('data-table-scroll-container');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('data-table-scroll');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders cards mode with structured rows and action buttons (NFR-USAB-06)', () => {
    render(
      <DataTable columns={mockColumns} data={mockData} responsiveMode="cards" />
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('data-table-cards-container')
    ).toBeInTheDocument();

    // Check cards
    const card0 = screen.getByTestId('data-table-card-0');
    expect(card0).toBeInTheDocument();
    expect(card0).toHaveTextContent('Fresh Ugwu');
    expect(card0).toHaveTextContent('₦1,200');
    expect(card0).toHaveTextContent('45 bunches');

    // Check actions inside card
    const cardActions = screen.getByTestId('data-table-card-actions-0');
    expect(cardActions).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit Fresh Ugwu' })
    ).toBeInTheDocument();
  });

  it('renders dual responsive mode by default with auto classes for CSS tablet/mobile switching', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        responsiveMode="responsive"
      />
    );

    const container = screen.getByTestId('data-table');
    expect(container).toHaveClass('data-table-responsive-auto');

    // Both views rendered for CSS media queries
    expect(
      screen.getByTestId('data-table-scroll-container')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('data-table-cards-container')
    ).toBeInTheDocument();
  });

  it('renders TableSkeleton when loading is true', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        loading={true}
        loadingRows={3}
      />
    );

    expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Fresh Ugwu')).not.toBeInTheDocument();
  });

  it('renders EmptyState when data array is empty', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        emptyTitle="No vegetables found"
        emptyDescription="Add listings to see them here"
      />
    );

    expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
    expect(screen.getByText('No vegetables found')).toBeInTheDocument();
    expect(
      screen.getByText('Add listings to see them here')
    ).toBeInTheDocument();
  });

  it('handles row click interaction and keyboard Enter/Space activation', async () => {
    const handleRowClick = vi.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onRowClick={handleRowClick}
        responsiveMode="scroll"
      />
    );

    const row0 = screen.getByTestId('data-table-row-0');
    await user.click(row0);
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);

    // Keyboard activation
    row0.focus();
    await user.keyboard('{Enter}');
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  it('allows manual view mode toggling when allowViewToggle is true', async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        title="Inventory Table"
        allowViewToggle={true}
      />
    );

    expect(screen.getByText('Inventory Table')).toBeInTheDocument();
    const toggleBtn = screen.getByTestId('data-table-view-toggle');
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('Card View')).toBeInTheDocument();

    // Toggle to Cards
    await user.click(toggleBtn);
    expect(
      screen.getByTestId('data-table-cards-container')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('data-table-scroll-container')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Table View')).toBeInTheDocument();

    // Toggle back to Table
    await user.click(toggleBtn);
    expect(
      screen.getByTestId('data-table-scroll-container')
    ).toBeInTheDocument();
  });

  it('supports custom renderCard function for cards mode', () => {
    const customCardRenderer = (row) => (
      <div data-testid={`custom-card-${row.id}`}>
        <h3>{row.name}</h3>
        <p>Custom Price: ₦{row.price}</p>
      </div>
    );

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        responsiveMode="cards"
        renderCard={customCardRenderer}
      />
    );

    expect(screen.getByTestId('custom-card-1')).toBeInTheDocument();
    expect(screen.getByText('Custom Price: ₦1200')).toBeInTheDocument();
  });

  it('renders pagination slot when provided', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        pagination={
          <div data-testid="test-pagination">Pagination Controls</div>
        }
      />
    );

    expect(screen.getByTestId('data-table-pagination')).toBeInTheDocument();
    expect(screen.getByTestId('test-pagination')).toBeInTheDocument();
  });
});
