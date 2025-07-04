/**
 * Mock data generators for pagination test suite
 * Provides realistic test data for collections, entries, and state objects
 */

import { Map, List, OrderedMap } from 'immutable';

import { PAGINATION_CONSTANTS } from './testConfiguration';

// Mock collection configurations
export const mockCollections = OrderedMap({
  posts: Map({
    name: 'posts',
    label: 'Posts',
    folder: '_posts',
    sortable_fields: ['title', 'date', 'author'],
    view_filters: [
      { label: 'Published', field: 'status', pattern: 'published' },
      { label: 'Draft', field: 'status', pattern: 'draft' },
    ],
    view_groups: [
      { label: 'By Author', field: 'author' },
      { label: 'By Category', field: 'category' },
    ],
  }),
  pages: Map({
    name: 'pages',
    label: 'Pages',
    folder: '_pages',
    sortable_fields: ['title', 'date'],
    view_filters: [],
    view_groups: [],
  }),
  'nested-collection': Map({
    name: 'nested-collection',
    label: 'Nested Collection',
    nested: Map({
      depth: 2,
      summary: '{{title}}',
    }),
    sortable_fields: ['title', 'date'],
    view_filters: [],
    view_groups: [],
  }),
});

/**
 * Generates mock entries for testing
 * @param count Number of entries to generate
 * @param collectionName Collection name for entries
 * @returns List of mock entries
 */
export function generateMockEntries(count: number, collectionName = 'posts') {
  return List(
    Array.from({ length: count }, (_, index) =>
      Map({
        slug: `entry-${index + 1}`,
        path: `_${collectionName}/entry-${index + 1}.md`,
        collection: collectionName,
        data: Map({
          title: `Entry ${index + 1}`,
          date: new Date(2024, 0, index + 1).toISOString(),
          author: `Author ${(index % 5) + 1}`,
          category: `Category ${(index % 3) + 1}`,
          status: index % 2 === 0 ? 'published' : 'draft',
          tags: List(['tag1', 'tag2', 'tag3'].slice(0, (index % 3) + 1)),
        }),
      })
    )
  );
}

/**
 * Generates mock entries with specific patterns for testing edge cases
 */
export const generateSpecialMockEntries = {
  withMissingFields: (count: number) => {
    return List(
      Array.from({ length: count }, (_, index) =>
        Map({
          slug: `entry-${index + 1}`,
          path: `_posts/entry-${index + 1}.md`,
          collection: 'posts',
          data: Map({
            title: index % 3 === 0 ? undefined : `Entry ${index + 1}`,
            date: index % 5 === 0 ? undefined : new Date(2024, 0, index + 1).toISOString(),
            author: `Author ${(index % 3) + 1}`,
          }),
        })
      )
    );
  },

  withDuplicateData: (count: number) => {
    return List(
      Array.from({ length: count }, (_, index) =>
        Map({
          slug: `entry-${index + 1}`,
          path: `_posts/entry-${index + 1}.md`,
          collection: 'posts',
          data: Map({
            title: index < count / 2 ? 'Duplicate Title' : `Entry ${index + 1}`,
            date: new Date(2024, 0, Math.floor(index / 2) + 1).toISOString(),
            author: 'Same Author',
          }),
        })
      )
    );
  },

  withLargeContent: (count: number) => {
    const largeContent = 'Lorem ipsum '.repeat(1000);
    return List(
      Array.from({ length: count }, (_, index) =>
        Map({
          slug: `entry-${index + 1}`,
          path: `_posts/entry-${index + 1}.md`,
          collection: 'posts',
          data: Map({
            title: `Entry ${index + 1}`,
            date: new Date(2024, 0, index + 1).toISOString(),
            content: largeContent,
            author: `Author ${(index % 5) + 1}`,
          }),
        })
      )
    );
  },
};

// Default pagination state
export const mockPaginationState = Map({
  currentPage: PAGINATION_CONSTANTS.FIRST_PAGE,
  perPage: PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE,
  totalEntries: 100,
  hasNextPage: true,
  hasPreviousPage: false,
  isLoadingMore: false,
  entries: generateMockEntries(PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE),
});

// Filter state configurations
export const mockFilterState = Map({
  activeFilters: Map(),
  availableFilters: List([
    Map({ label: 'Published', field: 'status', pattern: 'published' }),
    Map({ label: 'Draft', field: 'status', pattern: 'draft' }),
  ]),
});

// Sort state configurations
export const mockSortState = Map({
  sortKey: 'date',
  sortDirection: 'desc',
});

// Group state configurations
export const mockGroupState = Map({
  groupKey: null,
  groupedEntries: Map(),
});

// View style state configurations
export const mockViewStyleState = Map({
  viewStyle: 'list',
});

// Search state configurations
export const mockSearchState = Map({
  searchTerm: '',
  searchResults: List(),
  isSearching: false,
});

/**
 * Factory functions for creating specialized mock states
 */
export const createMockState = {
  withPagination: (overrides: Record<string, unknown> = {}) => ({
    ...mockPaginationState.toJS(),
    ...overrides,
  }),

  withFilter: (filterKey: string, filterValue: unknown) => ({
    ...mockFilterState.toJS(),
    activeFilters: Map({ [filterKey]: filterValue }),
  }),

  withSort: (sortKey: string, sortDirection: 'asc' | 'desc') => ({
    ...mockSortState.toJS(),
    sortKey,
    sortDirection,
  }),

  withGroup: (groupKey: string) => ({
    ...mockGroupState.toJS(),
    groupKey,
  }),

  withSearch: (searchTerm: string) => ({
    ...mockSearchState.toJS(),
    searchTerm,
    isSearching: true,
  }),

  empty: () => ({
    ...mockPaginationState.toJS(),
    totalEntries: 0,
    entries: List(),
    hasNextPage: false,
    hasPreviousPage: false,
  }),

  singlePage: (entryCount: number) => ({
    ...mockPaginationState.toJS(),
    totalEntries: entryCount,
    entries: generateMockEntries(entryCount),
    hasNextPage: false,
  }),

  largePage: (entryCount: number) => ({
    ...mockPaginationState.toJS(),
    totalEntries: entryCount,
    entries: generateMockEntries(Math.min(entryCount, PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE)),
    hasNextPage: entryCount > PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE,
  }),
};
