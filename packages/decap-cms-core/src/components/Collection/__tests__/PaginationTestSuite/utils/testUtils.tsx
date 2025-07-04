/**
 * Test utilities for pagination test suite
 * Provides custom rendering, performance measurement, and accessibility helpers
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';

import { setupMockStore } from './mockStore';
import { PERFORMANCE_LIMITS, ACTION_TYPES } from './testConfiguration';

import type { ReactElement } from 'react';
import type { RenderOptions } from '@testing-library/react';
import type { Store } from 'redux';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Record<string, unknown>;
  store?: Store;
}

/**
 * Custom render function with all necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupMockStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  measureRenderTime: (renderFunction: () => void): number => {
    const start = performance.now();
    renderFunction();
    return performance.now() - start;
  },

  measureMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as Performance & { memory: { usedJSHeapSize: number } }).memory
        .usedJSHeapSize;
    }
    return 0;
  },

  waitForStablePerformance: async (iterations: number = PERFORMANCE_LIMITS.STABLE_ITERATIONS): Promise<void> => {
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  isWithinPerformanceLimit: (actualTime: number, limitType: 'render' | 'memory' | 'rerender'): boolean => {
    switch (limitType) {
      case 'render':
        return actualTime < PERFORMANCE_LIMITS.MAX_RENDER_TIME;
      case 'memory':
        return actualTime < PERFORMANCE_LIMITS.MAX_MEMORY_USAGE;
      case 'rerender':
        return actualTime <= PERFORMANCE_LIMITS.MAX_RERENDER_COUNT;
      default:
        return false;
    }
  },
};

/**
 * Accessibility testing utilities
 */
export const accessibilityUtils = {
  getByAriaLabel: (container: HTMLElement, label: string): HTMLElement | null =>
    container.querySelector(`[aria-label="${label}"]`),

  getByAriaLabelText: (container: HTMLElement, labelText: string): HTMLElement | null =>
    container.querySelector(`[aria-labelledby*="${labelText}"], [aria-label*="${labelText}"]`),

  checkFocusManagement: (element: HTMLElement): boolean => {
    return document.activeElement === element;
  },

  getKeyboardNavigationOrder: (container: HTMLElement): HTMLElement[] => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusableElements) as HTMLElement[];
  },

  hasRequiredAriaAttributes: (element: HTMLElement, requiredAttributes: string[]): boolean => {
    return requiredAttributes.every(attr => element.hasAttribute(attr));
  },

  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex');
    return (
      element.tagName.toLowerCase() === 'button' ||
      element.tagName.toLowerCase() === 'a' ||
      (tabIndex !== null && tabIndex !== '-1')
    );
  },
};

/**
 * Feature interaction utilities for simulating user actions
 */
export const featureUtils = {
  applyFilter: (store: ReturnType<typeof setupMockStore>, filterKey: string, filterValue: unknown) => {
    store.dispatch({
      type: ACTION_TYPES.FILTER_ENTRIES,
      payload: { filterKey, filterValue },
    });
  },

  applySort: (store: ReturnType<typeof setupMockStore>, sortKey: string, sortDirection: 'asc' | 'desc') => {
    store.dispatch({
      type: ACTION_TYPES.SORT_ENTRIES,
      payload: { sortKey, sortDirection },
    });
  },

  applyGroup: (store: ReturnType<typeof setupMockStore>, groupKey: string) => {
    store.dispatch({
      type: ACTION_TYPES.GROUP_ENTRIES,
      payload: { groupKey },
    });
  },

  changeViewStyle: (store: ReturnType<typeof setupMockStore>, viewStyle: 'list' | 'grid') => {
    store.dispatch({
      type: ACTION_TYPES.CHANGE_VIEW_STYLE,
      payload: { viewStyle },
    });
  },

  performSearch: (store: ReturnType<typeof setupMockStore>, searchTerm: string) => {
    store.dispatch({
      type: ACTION_TYPES.SEARCH_ENTRIES,
      payload: { searchTerm },
    });
  },

  loadEntries: (store: ReturnType<typeof setupMockStore>, page: number, additionalParams = {}) => {
    store.dispatch({
      type: ACTION_TYPES.LOAD_ENTRIES_REQUEST,
      payload: { page, ...additionalParams },
    });
  },

  simulateLoadSuccess: (store: ReturnType<typeof setupMockStore>, page: number, entries: unknown[]) => {
    store.dispatch({
      type: ACTION_TYPES.LOAD_ENTRIES_SUCCESS,
      payload: { page, entries },
    });
  },

  simulateLoadFailure: (store: ReturnType<typeof setupMockStore>, error: { type: string; message?: string }) => {
    store.dispatch({
      type: ACTION_TYPES.LOAD_ENTRIES_FAILURE,
      payload: { error },
    });
  },
};

/**
 * Assertion helpers for common test patterns
 */
export const assertionHelpers = {
  expectActionDispatched: (
    store: ReturnType<typeof setupMockStore>,
    expectedAction: { type: string; payload?: unknown }
  ) => {
    const actions = store.getActions();
    const matchingAction = actions.find(
      action => action.type === expectedAction.type &&
        (expectedAction.payload ? JSON.stringify(action.payload) === JSON.stringify(expectedAction.payload) : true)
    );
    return matchingAction !== undefined;
  },

  expectActionsInOrder: (
    store: ReturnType<typeof setupMockStore>,
    expectedActions: Array<{ type: string; payload?: unknown }>
  ) => {
    const actions = store.getActions();
    const relevantActions = actions.filter(action =>
      expectedActions.some(expected => expected.type === action.type)
    );

    return expectedActions.every((expected, index) => {
      const actual = relevantActions[index];
      return actual?.type === expected.type &&
        (expected.payload ? JSON.stringify(actual.payload) === JSON.stringify(expected.payload) : true);
    });
  },

  expectNoActionsDispatched: (store: ReturnType<typeof setupMockStore>, actionTypes: string[]) => {
    const actions = store.getActions();
    return !actions.some(action => actionTypes.includes(action.type));
  },
};

/**
 * Test data generators for specific scenarios
 */
export const testDataGenerators = {
  createPaginationScenario: (
    totalEntries: number,
    currentPage: number,
    perPage = 20
  ) => {
    const startEntry = (currentPage - 1) * perPage + 1;
    const endEntry = Math.min(currentPage * perPage, totalEntries);
    const hasNextPage = currentPage * perPage < totalEntries;
    const hasPreviousPage = currentPage > 1;

    return {
      totalEntries,
      currentPage,
      perPage,
      startEntry,
      endEntry,
      hasNextPage,
      hasPreviousPage,
    };
  },

  createFeatureCombination: (features: string[]) => {
    const config: Record<string, unknown> = {};

    if (features.includes('filter')) {
      config.filter = { key: 'status', value: 'published' };
    }
    if (features.includes('sort')) {
      config.sort = { key: 'title', direction: 'asc' };
    }
    if (features.includes('group')) {
      config.group = 'author';
    }
    if (features.includes('search')) {
      config.search = 'test search';
    }
    if (features.includes('viewStyle')) {
      config.viewStyle = 'grid';
    }

    return config;
  },
};

export type MockStore = ReturnType<typeof setupMockStore>;
export type RenderResult = ReturnType<typeof renderWithProviders>;
