/**
 * Mock store configuration for pagination test suite
 * Provides redux store setup with immutable state management
 */

import * as reduxMockStore from 'redux-mock-store';
import { Map, List } from 'immutable';

import {
  mockCollections,
  mockPaginationState,
  mockFilterState,
  mockSortState,
  mockGroupState,
  mockViewStyleState,
  mockSearchState,
  generateMockEntries,
} from './mockData';

type Middleware = Parameters<typeof reduxMockStore.default>[0];
const middlewares: Middleware = [];
const mockStore = reduxMockStore.default(middlewares);

/**
 * Creates mock Redux state structure
 */
export function createMockState(overrides: Record<string, unknown> = {}) {
  const entriesOverrides = overrides.entries as Record<string, unknown> | undefined;
  const configOverrides = overrides.config as Record<string, unknown> | undefined;

  return {
    collections: mockCollections,
    entries: Map({
      pagination: mockPaginationState,
      filter: mockFilterState,
      sort: mockSortState,
      group: mockGroupState,
      viewStyle: mockViewStyleState,
      search: mockSearchState,
      ...(entriesOverrides || {}),
    }),
    config: Map({
      collections: mockCollections,
      ...(configOverrides || {}),
    }),
    ...overrides,
  };
}

/**
 * Sets up mock store with initial state
 */
export function setupMockStore(initialState: Record<string, unknown> = {}) {
  const state = createMockState(initialState);
  return mockStore(state);
}

/**
 * Preset store configurations for common test scenarios
 */
export const presetStores = {
  baseline: () => setupMockStore(),

  withFilter: (filterKey: string, filterValue: unknown) =>
    setupMockStore({
      entries: {
        filter: mockFilterState.setIn(['activeFilters', filterKey], filterValue),
      },
    }),

  withSort: (sortKey: string, sortDirection: 'asc' | 'desc') =>
    setupMockStore({
      entries: {
        sort: mockSortState.set('sortKey', sortKey).set('sortDirection', sortDirection),
      },
    }),

  withGroup: (groupKey: string) =>
    setupMockStore({
      entries: {
        group: mockGroupState.set('groupKey', groupKey as never),
      },
    }),

  withViewStyle: (viewStyle: 'list' | 'grid') =>
    setupMockStore({
      entries: {
        viewStyle: mockViewStyleState.set('viewStyle', viewStyle),
      },
    }),

  withSearch: (searchTerm: string) =>
    setupMockStore({
      entries: {
        search: mockSearchState.set('searchTerm', searchTerm),
      },
    }),

  withNestedCollection: () =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState.set('entries', generateMockEntries(20, 'nested-collection')),
      },
    }),

  withLargeDataset: (entryCount: number) =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState
          .set('totalEntries', entryCount)
          .set('entries', generateMockEntries(Math.min(entryCount, 20))),
      },
    }),

  withEmptyDataset: () =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState
          .set('totalEntries', 0)
          .set('entries', List())
          .set('hasNextPage', false)
          .set('hasPreviousPage', false),
      },
    }),

  withLoadingState: () =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState.set('isLoadingMore', true),
      },
    }),

  withMultipleFeatures: (config: {
    filter?: { key: string; value: unknown };
    sort?: { key: string; direction: 'asc' | 'desc' };
    group?: string;
    search?: string;
    viewStyle?: 'list' | 'grid';
  }) => {
    const entriesOverrides: Record<string, unknown> = {};

    if (config.filter) {
      entriesOverrides.filter = mockFilterState.setIn(
        ['activeFilters', config.filter.key],
        config.filter.value
      );
    }

    if (config.sort) {
      entriesOverrides.sort = mockSortState
        .set('sortKey', config.sort.key)
        .set('sortDirection', config.sort.direction);
    }

    if (config.group) {
      entriesOverrides.group = mockGroupState.set('groupKey', config.group as never);
    }

    if (config.search) {
      entriesOverrides.search = mockSearchState.set('searchTerm', config.search);
    }

    if (config.viewStyle) {
      entriesOverrides.viewStyle = mockViewStyleState.set('viewStyle', config.viewStyle);
    }

    return setupMockStore({
      entries: entriesOverrides,
    });
  },
};

/**
 * Store factory for error scenarios
 */
export const errorStores = {
  networkTimeout: () =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState.set('error' as never, { type: 'NETWORK_TIMEOUT' } as never),
      },
    }),

  malformedData: () =>
    setupMockStore({
      entries: {
        pagination: mockPaginationState.set('error' as never, { type: 'MALFORMED_DATA' } as never),
      },
    }),

  missingCollection: () =>
    setupMockStore({
      collections: Map(),
      entries: {
        pagination: mockPaginationState.set('error' as never, { type: 'MISSING_COLLECTION' } as never),
      },
    }),
};

export type MockStore = ReturnType<typeof setupMockStore>;
export type PresetStoreKey = keyof typeof presetStores;
