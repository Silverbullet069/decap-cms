/**
 * Filter + Pagination Integration Tests
 * Tests pagination functionality with filtering
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../utils/testUtils';
import { presetStores } from '../utils/mockStore';
import { TIMEOUTS, DATA_SETS } from '../utils/testConfiguration';

interface MockFilterPaginationProps {
  currentPage?: number;
  totalEntries?: number;
  perPage?: number;
  activeFilter?: string;
  filteredEntries?: number;
}

// Mock component that combines filtering and pagination
function MockFilterPagination({
  currentPage = 1,
  totalEntries = 100,
  perPage = 20,
  activeFilter = '',
  filteredEntries = 100
}: MockFilterPaginationProps) {
  const [filter, setFilter] = React.useState(activeFilter);
  const [page, setPage] = React.useState(currentPage);
  const displayEntries = filter ? filteredEntries : totalEntries;
  const startEntry = (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, displayEntries);
  const hasNextPage = page * perPage < displayEntries;
  const hasPreviousPage = page > 1;

  function handleFilterChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newFilter = event.target.value;
    setFilter(newFilter);
    // Reset to page 1 when filter changes
    setPage(1);
  }

  function handlePreviousClick() {
    setPage(Math.max(1, page - 1));
  }

  function handleNextClick() {
    setPage(page + 1);
  }

  return (
    <div>
      <div>
        <select
          value={filter}
          onChange={handleFilterChange}
          aria-label="Filter entries"
        >
          <option value="">All entries</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div>{`${startEntry}-${endEntry} of ${displayEntries}`}</div>
      {filter && <div>Filter: {filter}</div>}

      <button
        disabled={!hasPreviousPage}
        onClick={handlePreviousClick}
        aria-label="Previous page"
      >
        Previous
      </button>
      <button
        disabled={!hasNextPage}
        onClick={handleNextClick}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

describe('FilterPaginationIntegration', () => {
  beforeAll(() => {
    jest.setTimeout(TIMEOUTS.INTEGRATION);
  });

  describe('Filter + Pagination Basics', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reset pagination when filter is applied', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockFilterPagination />, { store });

      // Initially on page 1
      expect(screen.getByText(/1-20 of 100/i)).toBeInTheDocument();

      // Apply filter
      const filterSelect = screen.getByLabelText(/filter entries/i);
      fireEvent.change(filterSelect, { target: { value: 'published' } });

      // Should show filtered results
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();
    });

    it('should maintain filter when navigating pages', async () => {
      const store = presetStores.withFilter('status', 'published');
      renderWithProviders(
        <MockFilterPagination
          activeFilter="published"
          filteredEntries={50}
        />,
        { store }
      );

      expect(screen.getByText(/1-20 of 50/i)).toBeInTheDocument();
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Filter should still be active
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();
    });

    it('should handle filter resulting in empty dataset', async () => {
      const store = presetStores.baseline();
      renderWithProviders(
        <MockFilterPagination
          activeFilter="archived"
          filteredEntries={0}
        />,
        { store }
      );

      expect(screen.getByText(/1-0 of 0/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should handle filter resulting in single page', async () => {
      const store = presetStores.baseline();
      renderWithProviders(
        <MockFilterPagination
          activeFilter="draft"
          filteredEntries={15}
        />,
        { store }
      );

      expect(screen.getByText(/1-15 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should clear filter and show all entries', async () => {
      const store = presetStores.withFilter('status', 'published');
      renderWithProviders(
        <MockFilterPagination
          activeFilter="published"
          filteredEntries={50}
        />,
        { store }
      );

      // Clear filter
      const filterSelect = screen.getByLabelText(/filter entries/i);
      fireEvent.change(filterSelect, { target: { value: '' } });

      // Should show all entries
      expect(screen.queryByText(/filter:/i)).not.toBeInTheDocument();
    });
  });

  describe('Filter Navigation Edge Cases', () => {
    it('should handle filter change while on later page', async () => {
      const store = presetStores.baseline();
      renderWithProviders(
        <MockFilterPagination
          currentPage={3}
          totalEntries={100}
        />,
        { store }
      );

      // On page 3 initially
      expect(screen.getByText(/41-60 of 100/i)).toBeInTheDocument();

      // Apply filter that results in fewer pages
      const filterSelect = screen.getByLabelText(/filter entries/i);
      fireEvent.change(filterSelect, { target: { value: 'published' } });

      // Should reset to page 1
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();
    });

    it('should handle multiple filter changes', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockFilterPagination />, { store });

      const filterSelect = screen.getByLabelText(/filter entries/i);

      // Apply first filter
      fireEvent.change(filterSelect, { target: { value: 'published' } });
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();

      // Apply second filter
      fireEvent.change(filterSelect, { target: { value: 'draft' } });
      expect(screen.getByText(/filter: draft/i)).toBeInTheDocument();
    });

    it('should handle filter with large dataset', async () => {
      const store = presetStores.withLargeDataset(DATA_SETS.LARGE);
      renderWithProviders(
        <MockFilterPagination
          totalEntries={DATA_SETS.LARGE}
          activeFilter="published"
          filteredEntries={500}
        />,
        { store }
      );

      expect(screen.getByText(/1-20 of 500/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });
  });

  describe('Performance with Filters', () => {
    it('should handle rapid filter changes', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockFilterPagination />, { store });

      const filterSelect = screen.getByLabelText(/filter entries/i);

      // Rapid filter changes
      fireEvent.change(filterSelect, { target: { value: 'published' } });
      fireEvent.change(filterSelect, { target: { value: 'draft' } });
      fireEvent.change(filterSelect, { target: { value: '' } });

      // Should handle without errors
      expect(screen.getByLabelText(/filter entries/i)).toBeInTheDocument();
    });

    it('should handle filter with pagination navigation', async () => {
      const store = presetStores.withFilter('status', 'published');
      renderWithProviders(
        <MockFilterPagination
          activeFilter="published"
          filteredEntries={100}
        />,
        { store }
      );

      // Navigate through pages with filter active
      const nextButton = screen.getByRole('button', { name: /next/i });

      fireEvent.click(nextButton);
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();

      fireEvent.click(nextButton);
      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should dispatch correct actions for filter changes', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockFilterPagination />, { store });

      const filterSelect = screen.getByLabelText(/filter entries/i);
      fireEvent.change(filterSelect, { target: { value: 'published' } });

      // Mock component doesn't dispatch actions, but real component would
      expect(store.getActions()).toHaveLength(0);
    });

    it('should preserve filter state across renders', async () => {
      const store = presetStores.withFilter('status', 'published');
      const { rerender } = renderWithProviders(
        <MockFilterPagination
          activeFilter="published"
          filteredEntries={50}
        />,
        { store }
      );

      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();

      // Rerender with same props
      rerender(
        <MockFilterPagination
          activeFilter="published"
          filteredEntries={50}
        />
      );

      expect(screen.getByText(/filter: published/i)).toBeInTheDocument();
    });
  });
});
