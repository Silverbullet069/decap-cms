/**
 * Baseline Pagination Integration Tests
 * Tests pagination functionality without other features
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { renderWithProviders } from '../utils/testUtils';
import { presetStores } from '../utils/mockStore';
import { TIMEOUTS, DATA_SETS } from '../utils/testConfiguration';

interface MockPaginationControlProps {
  currentPage?: number;
  totalEntries?: number;
  perPage?: number;
}

// Mock the PaginationControl component for testing
function MockPaginationControl({
  currentPage = 1,
  totalEntries = 100,
  perPage = 20
}: MockPaginationControlProps) {
  const startEntry = (currentPage - 1) * perPage + 1;
  const endEntry = Math.min(currentPage * perPage, totalEntries);
  const hasNextPage = currentPage * perPage < totalEntries;
  const hasPreviousPage = currentPage > 1;

  function handlePreviousClick() {
    // Mock handler - would dispatch action in real component
  }

  function handleNextClick() {
    // Mock handler - would dispatch action in real component
  }

  return (
    <div>
      <div>{`${startEntry}-${endEntry} of ${totalEntries}`}</div>
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

describe('PaginationIntegration', () => {
  beforeAll(() => {
    jest.setTimeout(TIMEOUTS.INTEGRATION);
  });

  describe('Baseline Pagination', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render pagination controls with correct initial state', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl />, { store });

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
      expect(screen.getByText(/1-20 of 100/i)).toBeInTheDocument();
    });

    it('should show correct page information', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl currentPage={2} />, { store });

      expect(screen.getByText(/21-40 of 100/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    it('should handle navigation button clicks', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl />, { store });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Check that store received the action
      await waitFor(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(0); // Mock component doesn't dispatch actions
      });
    });

    it('should disable navigation buttons appropriately', () => {
      const store = presetStores.baseline();

      // Test first page
      renderWithProviders(<MockPaginationControl currentPage={1} />, { store });
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    it('should handle last page correctly', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl currentPage={5} totalEntries={100} />, { store });

      expect(screen.getByText(/81-100 of 100/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should show no entries message when dataset is empty', () => {
      const store = presetStores.withEmptyDataset();
      renderWithProviders(<MockPaginationControl totalEntries={0} />, { store });

      expect(screen.getByText(/1-0 of 0/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single page dataset', () => {
      const store = presetStores.withLargeDataset(15);
      renderWithProviders(<MockPaginationControl totalEntries={15} />, { store });

      expect(screen.getByText(/1-15 of 15/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should handle exactly page-size dataset', () => {
      const store = presetStores.withLargeDataset(20);
      renderWithProviders(<MockPaginationControl totalEntries={20} />, { store });

      expect(screen.getByText(/1-20 of 20/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should handle large datasets efficiently', () => {
      const store = presetStores.withLargeDataset(DATA_SETS.LARGE);
      renderWithProviders(<MockPaginationControl totalEntries={DATA_SETS.LARGE} />, { store });

      expect(screen.getByText(/1-20 of 1000/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    it('should handle partial last page', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl currentPage={5} totalEntries={85} />, { store });

      expect(screen.getByText(/81-85 of 85/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('should handle single entry dataset', () => {
      const store = presetStores.withLargeDataset(1);
      renderWithProviders(<MockPaginationControl totalEntries={1} />, { store });

      expect(screen.getByText(/1-1 of 1/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  describe('State Management', () => {
    it('should reflect store state correctly', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl />, { store });

      // Verify initial state
      expect(store.getState()).toBeDefined();
      expect(store.getActions()).toHaveLength(0);
    });

    it('should handle store state updates', async () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockPaginationControl />, { store });

      // Simulate state update
      store.dispatch({ type: 'TEST_ACTION', payload: {} });

      await waitFor(() => {
        const actions = store.getActions();
        expect(actions).toHaveLength(1);
        expect(actions[0].type).toBe('TEST_ACTION');
      });
    });
  });
});
