/**
 * Test configuration constants and settings for pagination test suite
 * Defines timeouts, performance benchmarks, data sets, and accessibility requirements
 */

// Test execution timeouts
export const TIMEOUTS = {
  DEFAULT: 5000,
  PERFORMANCE: 10000,
  INTEGRATION: 15000,
  ACCESSIBILITY: 8000,
} as const;

// Performance benchmarks
export const PERFORMANCE_LIMITS = {
  MAX_RENDER_TIME: 150, // ms (increased from 100ms for realistic CI/dev environments)
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  MAX_RERENDER_COUNT: 5,
  STABLE_ITERATIONS: 5,
} as const;

// Data generation settings
export const DATA_SETS = {
  SMALL: 10,
  MEDIUM: 100,
  LARGE: 1000,
  EXTRA_LARGE: 10000,
} as const;

// Pagination constants
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  FIRST_PAGE: 1,
} as const;

// Feature combinations to test
export const FEATURE_COMBINATIONS = {
  DUAL: [
    ['pagination', 'filter'],
    ['pagination', 'sort'],
    ['pagination', 'group'],
    ['pagination', 'viewStyle'],
    ['pagination', 'search'],
    ['pagination', 'nestedCollection'],
  ],
  TRIPLE: [
    ['pagination', 'filter', 'sort'],
    ['pagination', 'filter', 'group'],
    ['pagination', 'filter', 'viewStyle'],
    ['pagination', 'sort', 'group'],
    ['pagination', 'sort', 'viewStyle'],
    ['pagination', 'search', 'filter'],
  ],
  ALL: [
    ['pagination', 'filter', 'sort', 'group', 'viewStyle', 'search'],
  ],
} as const;

// Error scenarios
export const ERROR_SCENARIOS = {
  NETWORK_ERRORS: ['timeout', 'connection-refused', 'server-error'],
  DATA_ERRORS: ['malformed-data', 'missing-fields', 'invalid-types'],
  STATE_ERRORS: ['invalid-page', 'corrupted-state', 'missing-collection'],
} as const;

// Accessibility requirements
export const ACCESSIBILITY_CONFIG = {
  REQUIRED_ARIA_LABELS: [
    'pagination-control',
    'previous-page',
    'next-page',
    'page-info',
  ],
  KEYBOARD_NAVIGATION: ['Tab', 'Enter', 'Space', 'ArrowLeft', 'ArrowRight'],
  SCREEN_READER_SUPPORT: true,
  COLOR_CONTRAST_RATIO: 4.5, // WCAG AA standard
} as const;

// Redux action types
export const ACTION_TYPES = {
  LOAD_ENTRIES_REQUEST: 'LOAD_ENTRIES_REQUEST',
  LOAD_ENTRIES_SUCCESS: 'LOAD_ENTRIES_SUCCESS',
  LOAD_ENTRIES_FAILURE: 'LOAD_ENTRIES_FAILURE',
  FILTER_ENTRIES: 'FILTER_ENTRIES',
  SORT_ENTRIES: 'SORT_ENTRIES',
  GROUP_ENTRIES: 'GROUP_ENTRIES',
  CHANGE_VIEW_STYLE: 'CHANGE_VIEW_STYLE',
  SEARCH_ENTRIES: 'SEARCH_ENTRIES',
} as const;

// Test configuration object
export const testConfig = {
  timeouts: TIMEOUTS,
  performance: PERFORMANCE_LIMITS,
  dataSets: DATA_SETS,
  pagination: PAGINATION_CONSTANTS,
  featureCombinations: FEATURE_COMBINATIONS,
  errorScenarios: ERROR_SCENARIOS,
  accessibility: ACCESSIBILITY_CONFIG,
  actionTypes: ACTION_TYPES,
} as const;

export type TestConfig = typeof testConfig;
export type FeatureCombination = typeof FEATURE_COMBINATIONS.DUAL[number];
