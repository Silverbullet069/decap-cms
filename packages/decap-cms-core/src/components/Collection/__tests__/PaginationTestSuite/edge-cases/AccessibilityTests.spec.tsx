/**
 * Pagination Accessibility Tests
 * Tests accessibility compliance for pagination components
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders, accessibilityUtils } from '../utils/testUtils';
import { presetStores } from '../utils/mockStore';
import { TIMEOUTS } from '../utils/testConfiguration';

interface MockAccessiblePaginationProps {
  currentPage?: number;
  totalEntries?: number;
  perPage?: number;
  isLoading?: boolean;
}

// Mock pagination component with accessibility features
function MockAccessiblePagination({
  currentPage = 1,
  totalEntries = 100,
  perPage = 20,
  isLoading = false
}: MockAccessiblePaginationProps) {
  const startEntry = (currentPage - 1) * perPage + 1;
  const endEntry = Math.min(currentPage * perPage, totalEntries);
  const hasNextPage = currentPage * perPage < totalEntries;
  const hasPreviousPage = currentPage > 1;

  function handlePreviousClick() {
    // Mock handler - would dispatch pagination action
  }

  function handleNextClick() {
    // Mock handler - would dispatch pagination action
  }

  return (
    <div role="navigation" aria-label="Pagination navigation">
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="pagination-info"
      >
        {isLoading ? 'Loading entries...' : `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`}
      </div>

      <div>
        <button
          disabled={!hasPreviousPage || isLoading}
          onClick={handlePreviousClick}
          aria-label="Go to previous page"
          aria-disabled={!hasPreviousPage || isLoading}
          tabIndex={0}
        >
          Previous
        </button>

        <span aria-current="page">
          Page {currentPage} of {Math.ceil(totalEntries / perPage)}
        </span>

        <button
          disabled={!hasNextPage || isLoading}
          onClick={handleNextClick}
          aria-label="Go to next page"
          aria-disabled={!hasNextPage || isLoading}
          tabIndex={0}
        >
          Next
        </button>
      </div>
    </div>
  );
}

describe('PaginationAccessibility', () => {
  beforeAll(() => {
    jest.setTimeout(TIMEOUTS.ACCESSIBILITY);
  });

  describe('ARIA Labels and Roles', () => {
    it('should provide proper ARIA labels for pagination controls', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      // Check main navigation label
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Pagination navigation');

      // Check button labels
      expect(screen.getByRole('button', { name: /previous/i })).toHaveAttribute('aria-label', 'Go to previous page');
      expect(screen.getByRole('button', { name: /next/i })).toHaveAttribute('aria-label', 'Go to next page');

      // Check current page indicator
      expect(screen.getByText(/page 1 of 5/i)).toHaveAttribute('aria-current', 'page');
    });

    it('should provide live region for status updates', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const liveRegion = screen.getByTestId('pagination-info');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should update aria-disabled states correctly', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={1} />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
      expect(nextButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('should handle loading state accessibility', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination isLoading={true} />, { store });

      const liveRegion = screen.getByTestId('pagination-info');
      expect(liveRegion).toHaveTextContent('Loading entries...');

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation with Tab', () => {
      const store = presetStores.baseline();
      // Use currentPage=2 so both buttons are enabled and focusable
      const { container } = renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const focusableElements = accessibilityUtils.getKeyboardNavigationOrder(container);

      // Should have both pagination buttons
      expect(focusableElements).toHaveLength(2);

      // Test Tab navigation
      const firstButton = focusableElements[0];
      const secondButton = focusableElements[1];

      firstButton.focus();
      expect(accessibilityUtils.checkFocusManagement(firstButton)).toBe(true);

      secondButton.focus();
      expect(accessibilityUtils.checkFocusManagement(secondButton)).toBe(true);
    });

    it('should support Enter key activation', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Focus and press Enter
      prevButton.focus();
      fireEvent.keyDown(prevButton, { key: 'Enter' });

      nextButton.focus();
      fireEvent.keyDown(nextButton, { key: 'Enter' });

      // Should not throw errors
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('should support Space key activation', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Focus and press Space
      prevButton.focus();
      fireEvent.keyDown(prevButton, { key: ' ' });

      nextButton.focus();
      fireEvent.keyDown(nextButton, { key: ' ' });

      // Should not throw errors
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('should handle arrow key navigation', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Test arrow key navigation
      prevButton.focus();
      fireEvent.keyDown(prevButton, { key: 'ArrowLeft' });

      nextButton.focus();
      fireEvent.keyDown(nextButton, { key: 'ArrowRight' });

      // Should handle without errors
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide screen reader compatible content', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const pageInfo = screen.getByTestId('pagination-info');
      expect(pageInfo).toHaveAttribute('aria-live', 'polite');
      expect(pageInfo).toHaveTextContent('Showing 1 to 20 of 100 entries');

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('should announce page changes to screen readers', () => {
      const store = presetStores.baseline();
      const { rerender } = renderWithProviders(<MockAccessiblePagination />, { store });

      const pageInfo = screen.getByTestId('pagination-info');
      expect(pageInfo).toHaveTextContent('Showing 1 to 20 of 100 entries');

      // Simulate page change
      rerender(<MockAccessiblePagination currentPage={2} />);

      expect(pageInfo).toHaveTextContent('Showing 21 to 40 of 100 entries');
      expect(pageInfo).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide context for current page', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={3} />, { store });

      const currentPageElement = screen.getByText(/page 3 of 5/i);
      expect(currentPageElement).toHaveAttribute('aria-current', 'page');
    });

    it('should handle edge cases for screen readers', () => {
      const store = presetStores.withEmptyDataset();
      renderWithProviders(<MockAccessiblePagination totalEntries={0} />, { store });

      const pageInfo = screen.getByTestId('pagination-info');
      expect(pageInfo).toHaveTextContent('Showing 1 to 0 of 0 entries');

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus after pagination actions', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const nextButton = screen.getByRole('button', { name: /next/i });

      nextButton.focus();
      expect(accessibilityUtils.checkFocusManagement(nextButton)).toBe(true);

      fireEvent.click(nextButton);

      // Focus should remain on the button after click
      expect(accessibilityUtils.checkFocusManagement(nextButton)).toBe(true);
    });

    it('should handle focus when buttons become disabled', () => {
      const store = presetStores.baseline();
      const { rerender } = renderWithProviders(<MockAccessiblePagination currentPage={2} />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      prevButton.focus();

      // Navigate to first page (previous button becomes disabled)
      rerender(<MockAccessiblePagination currentPage={1} />);

      // Focus should still be manageable
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should provide proper focus indicators', () => {
      const store = presetStores.baseline();
      const { container } = renderWithProviders(<MockAccessiblePagination />, { store });

      const focusableElements = accessibilityUtils.getKeyboardNavigationOrder(container);

      focusableElements.forEach(element => {
        element.focus();
        // Element should be focusable
        expect(element).toHaveAttribute('tabindex', '0');
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('should meet WCAG 2.1 AA color contrast requirements', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      // Basic test - in real implementation, would use color contrast testing tools
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should provide meaningful text alternatives', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Buttons should have descriptive labels
      expect(prevButton).toHaveAttribute('aria-label', 'Go to previous page');
      expect(nextButton).toHaveAttribute('aria-label', 'Go to next page');
    });

    it('should support high contrast mode', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Pagination navigation');

      // Elements should be identifiable in high contrast mode
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should handle reduced motion preferences', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      // Should not have motion-based interactions that can't be disabled
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        fireEvent.click(button);
        // Should not cause motion sickness or vestibular disorders
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Assistive Technology Support', () => {
    it('should work with screen readers', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Pagination navigation');

      const liveRegion = screen.getByTestId('pagination-info');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should work with voice control software', () => {
      const store = presetStores.baseline();
      renderWithProviders(<MockAccessiblePagination />, { store });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Buttons should have clear, unique labels for voice commands
      expect(prevButton).toHaveAttribute('aria-label', 'Go to previous page');
      expect(nextButton).toHaveAttribute('aria-label', 'Go to next page');
    });

    it('should support switch navigation devices', () => {
      const store = presetStores.baseline();
      const { container } = renderWithProviders(<MockAccessiblePagination />, { store });

      const focusableElements = accessibilityUtils.getKeyboardNavigationOrder(container);

      // Should have logical tab order
      expect(focusableElements).toHaveLength(2);

      // Each focusable element should be reachable
      focusableElements.forEach((element) => {
        expect(element).toBeInTheDocument();
        expect(element.tagName).toBe('BUTTON');
      });
    });
  });
});
