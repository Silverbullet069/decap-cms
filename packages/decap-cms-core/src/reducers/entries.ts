import { Map, List, fromJS, OrderedMap, Set } from 'immutable';
import { dirname, join } from 'path';
import { isAbsolutePath, basename } from 'decap-cms-lib-util';
import trim from 'lodash/trim';
import once from 'lodash/once';
import sortBy from 'lodash/sortBy';
import set from 'lodash/set';
import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import { stringTemplate } from 'decap-cms-lib-widgets';

import { SortDirection } from '../types/redux';
import { folderFormatter } from '../lib/formatters';
import { selectSortDataPath } from './collections';
import { SEARCH_ENTRIES_SUCCESS } from '../actions/search';
import {
  ENTRY_REQUEST,
  ENTRY_SUCCESS,
  ENTRY_FAILURE,
  ENTRIES_REQUEST,
  ENTRIES_SUCCESS,
  ENTRIES_FAILURE,
  ENTRY_DELETE_SUCCESS,
  SORT_ENTRIES_REQUEST,
  SORT_ENTRIES_SUCCESS,
  SORT_ENTRIES_FAILURE,
  FILTER_ENTRIES_REQUEST,
  FILTER_ENTRIES_SUCCESS,
  FILTER_ENTRIES_FAILURE,
  GROUP_ENTRIES_REQUEST,
  GROUP_ENTRIES_SUCCESS,
  GROUP_ENTRIES_FAILURE,
  CHANGE_VIEW_STYLE,
  CHANGE_PAGINATION_PAGE,
  CHANGE_PAGINATION_PAGE_SIZE,
  SET_PAGINATION_TOTAL,
  LAZY_LOADING_REQUEST,
  LAZY_LOADING_SUCCESS,
  LAZY_LOADING_FAILURE,
  SET_ALL_ENTRIES_LOADED,
  LOADING_ALL_ENTRIES_PROGRESS,
} from '../actions/entries';
import { VIEW_STYLE_LIST } from '../constants/collectionViews';
import { joinUrlPath } from '../lib/urlHelper';

import type {
  EntriesAction,
  EntryRequestPayload,
  EntrySuccessPayload,
  EntriesSuccessPayload,
  EntryObject,
  Entries,
  CmsConfig,
  Collection,
  EntryFailurePayload,
  EntryDeletePayload,
  EntriesRequestPayload,
  EntryDraft,
  EntryMap,
  EntryField,
  CollectionFiles,
  EntriesSortRequestPayload,
  EntriesSortFailurePayload,
  SortMap,
  SortObject,
  Sort,
  Filter,
  Group,
  FilterMap,
  GroupMap,
  EntriesFilterRequestPayload,
  EntriesFilterFailurePayload,
  ChangeViewStylePayload,
  PaginationChangePagePayload,
  PaginationChangePageSizePayload,
  PaginationSetTotalPayload,
  EntriesGroupRequestPayload,
  EntriesGroupFailurePayload,
  GroupOfEntries,
  LazyLoadingRequestPayload,
  LazyLoadingSuccessPayload,
  LazyLoadingFailurePayload,
} from '../types/redux';

const { keyToPathArray } = stringTemplate;

let collection: string;
let loadedEntries: EntryObject[];
let append: boolean;
let page: number;
let slug: string;

const storageSortKey = 'decap-cms.entries.sort';
const viewStyleKey = 'decap-cms.entries.viewStyle';
type StorageSortObject = SortObject & { index: number };
type StorageSort = { [collection: string]: { [key: string]: StorageSortObject } };

const loadSort = once(() => {
  const sortString = localStorage.getItem(storageSortKey);
  if (sortString) {
    try {
      const sort: StorageSort = JSON.parse(sortString);
      let map = Map() as Sort;
      Object.entries(sort).forEach(([collection, sort]) => {
        let orderedMap = OrderedMap() as SortMap;
        sortBy(Object.values(sort), ['index']).forEach(value => {
          const { key, direction } = value;
          orderedMap = orderedMap.set(key, fromJS({ key, direction }));
        });
        map = map.set(collection, orderedMap);
      });
      return map;
    } catch (e) {
      return Map() as Sort;
    }
  }
  return Map() as Sort;
});

function clearSort() {
  localStorage.removeItem(storageSortKey);
}

function persistSort(sort: Sort | undefined) {
  if (sort) {
    const storageSort: StorageSort = {};
    sort.keySeq().forEach(key => {
      const collection = key as string;
      const sortObjects = (sort.get(collection).valueSeq().toJS() as SortObject[]).map(
        (value, index) => ({ ...value, index }),
      );

      sortObjects.forEach(value => {
        set(storageSort, [collection, value.key], value);
      });
    });
    localStorage.setItem(storageSortKey, JSON.stringify(storageSort));
  } else {
    clearSort();
  }
}

const loadViewStyle = once(() => {
  const viewStyle = localStorage.getItem(viewStyleKey);
  if (viewStyle) {
    return viewStyle;
  }

  localStorage.setItem(viewStyleKey, VIEW_STYLE_LIST);
  return VIEW_STYLE_LIST;
});

function clearViewStyle() {
  localStorage.removeItem(viewStyleKey);
}

function persistViewStyle(viewStyle: string | undefined) {
  if (viewStyle) {
    localStorage.setItem(viewStyleKey, viewStyle);
  } else {
    clearViewStyle();
  }
}

function entries(
  state = Map({
    entities: Map(),
    pages: Map(),
    sort: loadSort(),
    filter: Map(),
    group: Map(),
    pagination: Map(),
    viewStyle: loadViewStyle(),
    collections: Map(),
  }),
  action: EntriesAction,
) {
  switch (action.type) {
    case ENTRY_REQUEST: {
      const payload = action.payload as EntryRequestPayload;
      return state.setIn(['entities', `${payload.collection}.${payload.slug}`, 'isFetching'], true);
    }

    case ENTRY_SUCCESS: {
      const payload = action.payload as EntrySuccessPayload;
      collection = payload.collection;
      slug = payload.entry.slug;
      return state.withMutations(map => {
        map.setIn(['entities', `${collection}.${slug}`], fromJS(payload.entry));
        const ids = map.getIn(['pages', collection, 'ids'], List());
        const isNewEntry = !ids.includes(slug);
        if (isNewEntry) {
          map.setIn(['pages', collection, 'ids'], ids.unshift(slug));

          // Update pagination total entries count for new entries
          if (map.hasIn(['pagination', collection])) {
            const currentTotal = map.getIn(['pagination', collection, 'totalEntries']) || 0;
            map.setIn(['pagination', collection, 'totalEntries'], currentTotal + 1);
          }
        }
      });
    }

    case ENTRIES_REQUEST: {
      const payload = action.payload as EntriesRequestPayload;
      const newState = state.withMutations(map => {
        map.setIn(['pages', payload.collection, 'isFetching'], true);
      });

      return newState;
    }

    case ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      collection = payload.collection;
      loadedEntries = payload.entries;
      append = payload.append;
      page = payload.page;
      return state.withMutations(map => {
        loadedEntries.forEach(entry =>
          map.setIn(
            ['entities', `${collection}.${entry.slug}`],
            fromJS(entry).set('isFetching', false),
          ),
        );

        const ids = List(loadedEntries.map(entry => entry.slug));
        const isPaginated = map.hasIn(['pagination', collection]);

        // For pagination with lazy loading, we need to accumulate all loaded entries
        // instead of replacing them, so that frontend pagination can work correctly
        let finalIds;
        if (isPaginated && append) {
          // When pagination is enabled and we're appending, accumulate the entries
          const existingIds = map.getIn(['pages', collection, 'ids'], List());

          // Deduplicate entries to prevent duplicate entries from appearing
          const uniqueNewIds = ids.filter(id => !existingIds.includes(id));
          finalIds = existingIds.concat(uniqueNewIds);
        } else {
          // For initial load or non-paginated collections, replace the entries
          finalIds = ids;
        }

        map.setIn(
          ['pages', collection],
          Map({
            page,
            ids: finalIds,
          }),
        );

        // Initialize pagination state if not exists
        if (!map.hasIn(['pagination', collection])) {
          // Use total entries from backend response if available
          const totalCount = payload.totalEntries ?? loadedEntries.length;

          map.setIn(['pagination', collection], Map({
            currentPage: 1,
            pageSize: 8, // Fixed page size for frontend pagination
            totalEntries: totalCount,
            enabled: true,
            loadedCount: loadedEntries.length,
            totalAvailable: totalCount,
            isLoadingMore: false,
            hasMore: loadedEntries.length < totalCount,
          }));
        } else {
          // Update pagination state with new loading information
          const currentLoaded = map.getIn(['pagination', collection, 'loadedCount'], 0);
          const newLoadedCount = append ? currentLoaded + loadedEntries.length : loadedEntries.length;
          const existingTotalAvailable = map.getIn(['pagination', collection, 'totalAvailable'], 0);
          const totalCount = payload.totalEntries ?? existingTotalAvailable;

          // Only update totalEntries and totalAvailable if we have a valid total from the backend
          if (payload.totalEntries !== undefined) {
            map.setIn(['pagination', collection, 'totalEntries'], totalCount);
            map.setIn(['pagination', collection, 'totalAvailable'], totalCount);
          }
          map.setIn(['pagination', collection, 'loadedCount'], newLoadedCount);
          map.setIn(['pagination', collection, 'hasMore'], newLoadedCount < totalCount);
          map.setIn(['pagination', collection, 'isLoadingMore'], false);
        }
      });
    }
    case ENTRIES_FAILURE:
      return state.setIn(['pages', action.meta.collection, 'isFetching'], false);

    case ENTRY_FAILURE: {
      const payload = action.payload as EntryFailurePayload;
      return state.withMutations(map => {
        map.setIn(['entities', `${payload.collection}.${payload.slug}`, 'isFetching'], false);
        map.setIn(
          ['entities', `${payload.collection}.${payload.slug}`, 'error'],
          payload.error.message,
        );
      });
    }

    case SEARCH_ENTRIES_SUCCESS: {
      const payload = action.payload as EntriesSuccessPayload;
      loadedEntries = payload.entries;
      return state.withMutations(map => {
        loadedEntries.forEach(entry =>
          map.setIn(
            ['entities', `${entry.collection}.${entry.slug}`],
            fromJS(entry).set('isFetching', false),
          ),
        );
      });
    }

    case ENTRY_DELETE_SUCCESS: {
      const payload = action.payload as EntryDeletePayload;
      return state.withMutations(map => {
        map.deleteIn(['entities', `${payload.collectionName}.${payload.entrySlug}`]);
        map.updateIn(['pages', payload.collectionName, 'ids'], (ids: string[]) =>
          ids.filter(id => id !== payload.entrySlug),
        );

        // Update pagination total entries count
        if (map.hasIn(['pagination', payload.collectionName])) {
          const currentTotal = map.getIn(['pagination', payload.collectionName, 'totalEntries']) || 0;
          map.setIn(['pagination', payload.collectionName, 'totalEntries'], Math.max(0, currentTotal - 1));
        }
      });
    }

    case SORT_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesSortRequestPayload;
      const { collection, key, direction } = payload;
      const newState = state.withMutations(map => {
        const sort = OrderedMap({ [key]: Map({ key, direction }) });
        map.setIn(['sort', collection], sort);
        map.setIn(['pages', collection, 'isFetching'], true);
        map.deleteIn(['pages', collection, 'page']);
      });
      persistSort(newState.get('sort') as Sort);
      return newState;
    }

    case GROUP_ENTRIES_SUCCESS:
    case FILTER_ENTRIES_SUCCESS:
    case SORT_ENTRIES_SUCCESS: {
      const payload = action.payload as { collection: string; entries: EntryObject[] };
      const { collection, entries } = payload;
      loadedEntries = entries;
      const newState = state.withMutations(map => {
        // Only update entries if they are provided (not empty array)
        if (loadedEntries.length > 0) {
          loadedEntries.forEach(entry =>
            map.setIn(
              ['entities', `${entry.collection}.${entry.slug}`],
              fromJS(entry).set('isFetching', false),
            ),
          );
          const ids = List(loadedEntries.map(entry => entry.slug));
          map.setIn(
            ['pages', collection],
            Map({
              page: 1,
              ids,
            }),
          );
        }
        // Always clear loading state
        map.setIn(['pages', collection, 'isFetching'], false);
      });
      return newState;
    }

    case SORT_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesSortFailurePayload;
      const { collection, key } = payload;
      const newState = state.withMutations(map => {
        map.deleteIn(['sort', collection, key]);
        map.setIn(['pages', collection, 'isFetching'], false);
      });
      persistSort(newState.get('sort') as Sort);
      return newState;
    }

    case FILTER_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesFilterRequestPayload;
      const { collection, filter } = payload;
      const newState = state.withMutations(map => {
        const current: FilterMap = map.getIn(['filter', collection, filter.id], fromJS(filter));
        map.setIn(
          ['filter', collection, current.get('id')],
          current.set('active', !current.get('active')),
        );
        // ADD: Set loading state for consistency
        map.setIn(['pages', collection, 'isFetching'], true);
      });
      return newState;
    }

    case FILTER_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesFilterFailurePayload;
      const { collection, filter } = payload;
      const newState = state.withMutations(map => {
        map.deleteIn(['filter', collection, filter.id]);
        map.setIn(['pages', collection, 'isFetching'], false);
      });
      return newState;
    }

    case GROUP_ENTRIES_REQUEST: {
      const payload = action.payload as EntriesGroupRequestPayload;
      const { collection, group } = payload;
      const newState = state.withMutations(map => {
        const current: GroupMap = map.getIn(['group', collection, group.id], fromJS(group));
        map.deleteIn(['group', collection]);
        map.setIn(
          ['group', collection, current.get('id')],
          current.set('active', !current.get('active')),
        );
      });
      return newState;
    }

    case GROUP_ENTRIES_FAILURE: {
      const payload = action.payload as EntriesGroupFailurePayload;
      const { collection, group } = payload;
      const newState = state.withMutations(map => {
        map.deleteIn(['group', collection, group.id]);
        map.setIn(['pages', collection, 'isFetching'], false);
      });
      return newState;
    }

    case CHANGE_VIEW_STYLE: {
      const payload = action.payload as unknown as ChangeViewStylePayload;
      const { style } = payload;
      const newState = state.withMutations(map => {
        map.setIn(['viewStyle'], style);
      });
      persistViewStyle(newState.get('viewStyle') as string);
      return newState;
    }

    case LAZY_LOADING_REQUEST: {
      const payload = action.payload as LazyLoadingRequestPayload;
      const { collection } = payload;
      return state.withMutations(map => {
        map.setIn(['pagination', collection, 'isLoadingMore'], true);
      });
    }

    case LAZY_LOADING_SUCCESS: {
      const payload = action.payload as LazyLoadingSuccessPayload;
      const { collection } = payload;
      return state.withMutations(map => {
        map.setIn(['pagination', collection, 'isLoadingMore'], false);
      });
    }

    case LAZY_LOADING_FAILURE: {
      const payload = action.payload as LazyLoadingFailurePayload;
      const { collection } = payload;
      return state.withMutations(map => {
        map.setIn(['pagination', collection, 'isLoadingMore'], false);
      });
    }

    case CHANGE_PAGINATION_PAGE: {
      const payload = action.payload as unknown as PaginationChangePagePayload;
      const { collection, page } = payload;
      return state.setIn(['pagination', collection, 'currentPage'], page);
    }

    case CHANGE_PAGINATION_PAGE_SIZE: {
      const payload = action.payload as unknown as PaginationChangePageSizePayload;
      const { collection, pageSize } = payload;
      return state.withMutations(map => {
        map.setIn(['pagination', collection, 'pageSize'], pageSize);
        map.setIn(['pagination', collection, 'currentPage'], 1); // Reset to first page
      });
    }

    case SET_PAGINATION_TOTAL: {
      const payload = action.payload as unknown as PaginationSetTotalPayload;
      const { collection, totalEntries } = payload;
      return state.setIn(['pagination', collection, 'totalEntries'], totalEntries);
    }

    case SET_ALL_ENTRIES_LOADED: {
      const payload = action.payload as { collection: string };
      return state.withMutations(map => {
        map.setIn(['collections', payload.collection, 'allEntriesLoaded'], true);
        // Clear loading progress when entries are loaded
        map.deleteIn(['collections', payload.collection, 'loadingProgress']);
      });
    }

    case LOADING_ALL_ENTRIES_PROGRESS: {
      const payload = action.payload as { collection: string; message: string };
      return payload.message
        ? state.setIn(['collections', payload.collection, 'loadingProgress'], payload.message)
        : state.deleteIn(['collections', payload.collection, 'loadingProgress']);
    }

    default:
      return state;
  }
}

export function selectEntriesSort(entries: Entries, collection: string) {
  const sort = entries.get('sort') as Sort | undefined;
  return sort?.get(collection);
}

export function selectEntriesFilter(entries: Entries, collection: string) {
  const filter = entries.get('filter') as Filter | undefined;
  return filter?.get(collection) || Map();
}

export function selectEntriesGroup(entries: Entries, collection: string) {
  const group = entries.get('group') as Group | undefined;
  return group?.get(collection) || Map();
}

export function selectEntriesGroupField(entries: Entries, collection: string) {
  const groups = selectEntriesGroup(entries, collection);
  const value = groups?.valueSeq().find(v => v?.get('active') === true);
  return value;
}

export function selectEntriesSortFields(entries: Entries, collection: string) {
  const sort = selectEntriesSort(entries, collection);
  const values =
    sort
      ?.valueSeq()
      .filter(v => v?.get('direction') !== SortDirection.None)
      .toArray() || [];

  return values;
}

export function selectEntriesFilterFields(entries: Entries, collection: string) {
  const filter = selectEntriesFilter(entries, collection);
  const values =
    filter
      ?.valueSeq()
      .filter(v => v?.get('active') === true)
      .toArray() || [];
  return values;
}

export function selectViewStyle(entries: Entries) {
  return entries.get('viewStyle');
}

export function selectEntry(state: Entries, collection: string, slug: string) {
  return state.getIn(['entities', `${collection}.${slug}`]);
}

export function selectPublishedSlugs(state: Entries, collection: string) {
  return state.getIn(['pages', collection, 'ids'], List<string>());
}

function getPublishedEntries(state: Entries, collectionName: string) {
  const slugs = selectPublishedSlugs(state, collectionName);
  const entries =
    slugs &&
    (slugs.map(slug => selectEntry(state, collectionName, slug as string)) as List<EntryMap>);
  return entries;
}

export function selectEntries(state: Entries, collection: Collection) {
  const collectionName = collection.get('name');
  let entries = getPublishedEntries(state, collectionName);

  // Filter out null/undefined entries to prevent issues during sorting
  if (entries) {
    entries = entries.filter(entry => entry != null).toList();
  }

  const sortFields = selectEntriesSortFields(state, collectionName);
  if (sortFields && sortFields.length > 0) {
    const keys = sortFields.map(v => selectSortDataPath(collection, v.get('key')));
    const orders = sortFields.map(v =>
      v.get('direction') === SortDirection.Ascending ? 'asc' : 'desc',
    );
    entries = fromJS(orderBy(entries.toJS(), keys, orders));
  }

  const filters = selectEntriesFilterFields(state, collectionName);
  if (filters && filters.length > 0) {
    entries = entries
      .filter(e => {
        const allMatched = filters.every(f => {
          const pattern = f.get('pattern');
          const field = f.get('field');
          const data = e!.get('data') || Map();
          const toMatch = data.getIn(keyToPathArray(field));
          const matched =
            toMatch !== undefined && new RegExp(String(pattern)).test(String(toMatch));
          return matched;
        });
        return allMatched;
      })
      .toList();
  }

  return entries;
}

function getGroup(entry: EntryMap, selectedGroup: GroupMap) {
  const label = selectedGroup.get('label');
  const field = selectedGroup.get('field');

  const fieldData = entry.getIn(['data', ...keyToPathArray(field)]);
  if (fieldData === undefined) {
    return {
      id: 'missing_value',
      label,
      value: fieldData,
    };
  }

  const dataAsString = String(fieldData);
  if (selectedGroup.has('pattern')) {
    const pattern = selectedGroup.get('pattern');
    let value = '';
    try {
      const regex = new RegExp(pattern);
      const matched = dataAsString.match(regex);
      if (matched) {
        value = matched[0];
      }
    } catch (e) {
      console.warn(`Invalid view group pattern '${pattern}' for field '${field}'`, e);
    }
    return {
      id: `${label}${value}`,
      label,
      value,
    };
  }

  return {
    id: `${label}${fieldData}`,
    label,
    value: typeof fieldData === 'boolean' ? fieldData : dataAsString,
  };
}

export function selectGroups(state: Entries, collection: Collection) {
  const collectionName = collection.get('name');
  const entries = getPublishedEntries(state, collectionName);

  const selectedGroup = selectEntriesGroupField(state, collectionName);
  if (selectedGroup === undefined) {
    return [];
  }

  let groups: Record<string, { id: string; label: string; value: string | boolean | undefined }> =
    {};
  const groupedEntries = groupBy(entries.toArray(), entry => {
    const group = getGroup(entry, selectedGroup);
    groups = { ...groups, [group.id]: group };
    return group.id;
  });

  const groupsArray: GroupOfEntries[] = Object.entries(groupedEntries).map(([id, entries]) => {
    return {
      ...groups[id],
      paths: Set(entries.map(entry => entry.get('path'))),
    };
  });

  return groupsArray;
}

export function selectEntryByPath(state: Entries, collection: string, path: string) {
  const slugs = selectPublishedSlugs(state, collection);
  const entries =
    slugs && (slugs.map(slug => selectEntry(state, collection, slug as string)) as List<EntryMap>);

  return entries && entries.find(e => e?.get('path') === path);
}

export function selectEntriesLoaded(state: Entries, collection: string) {
  return !!state.getIn(['pages', collection]);
}

export function selectIsFetching(state: Entries, collection: string) {
  return state.getIn(['pages', collection, 'isFetching'], false);
}

export function selectAllEntriesLoaded(state: Entries, collection: string) {
  const collections = state.get('collections');
  if (collections && collections.has(collection)) {
    return collections.getIn([collection, 'allEntriesLoaded'], false);
  }
  return false;
}

const DRAFT_MEDIA_FILES = 'DRAFT_MEDIA_FILES';

function getFileField(collectionFiles: CollectionFiles, slug: string | undefined) {
  const file = collectionFiles.find(f => f?.get('name') === slug);
  return file;
}

function hasCustomFolder(
  folderKey: 'media_folder' | 'public_folder',
  collection: Collection | null,
  slug: string | undefined,
  field: EntryField | undefined,
) {
  if (!collection) {
    return false;
  }

  if (field && field.has(folderKey)) {
    return true;
  }

  if (collection.has('files')) {
    const file = getFileField(collection.get('files')!, slug);
    if (file && file.has(folderKey)) {
      return true;
    }
  }

  if (collection.has(folderKey)) {
    return true;
  }

  return false;
}

function traverseFields(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: Collection,
  entryMap: EntryMap | undefined,
  field: EntryField,
  fields: EntryField[],
  currentFolder: string,
): string | null {
  const matchedField = fields.filter(f => f === field)[0];
  if (matchedField) {
    return folderFormatter(
      matchedField.has(folderKey) ? matchedField.get(folderKey)! : `{{${folderKey}}}`,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
  }

  for (let f of fields) {
    if (!f.has(folderKey)) {
      // add identity template if doesn't exist
      f = f.set(folderKey, `{{${folderKey}}}`);
    }
    const folder = folderFormatter(
      f.get(folderKey)!,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );
    let fieldFolder = null;
    if (f.has('fields')) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.get('fields')!.toArray(),
        folder,
      );
    } else if (f.has('field')) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        [f.get('field')!],
        folder,
      );
    } else if (f.has('types')) {
      fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        f.get('types')!.toArray(),
        folder,
      );
    }
    if (fieldFolder != null) {
      return fieldFolder;
    }
  }

  return null;
}

function evaluateFolder(
  folderKey: 'media_folder' | 'public_folder',
  config: CmsConfig,
  collection: Collection,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  let currentFolder = config[folderKey]!;

  // add identity template if doesn't exist
  if (!collection.has(folderKey)) {
    collection = collection.set(folderKey, `{{${folderKey}}}`);
  }

  if (collection.has('files')) {
    // files collection evaluate the collection template
    // then move on to the specific file configuration denoted by the slug
    currentFolder = folderFormatter(
      collection.get(folderKey)!,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );

    let file = getFileField(collection.get('files')!, entryMap?.get('slug'));
    if (file) {
      if (!file.has(folderKey)) {
        // add identity template if doesn't exist
        file = file.set(folderKey, `{{${folderKey}}}`);
      }

      // evaluate the file template and keep evaluating until we match our field
      currentFolder = folderFormatter(
        file.get(folderKey)!,
        entryMap,
        collection,
        currentFolder,
        folderKey,
        config.slug,
      );

      if (field) {
        const fieldFolder = traverseFields(
          folderKey,
          config,
          collection,
          entryMap,
          field,
          file.get('fields')!.toArray(),
          currentFolder,
        );

        if (fieldFolder !== null) {
          currentFolder = fieldFolder;
        }
      }
    }
  } else {
    // folder collection, evaluate the collection template
    // and keep evaluating until we match our field
    currentFolder = folderFormatter(
      collection.get(folderKey)!,
      entryMap,
      collection,
      currentFolder,
      folderKey,
      config.slug,
    );

    if (field) {
      const fieldFolder = traverseFields(
        folderKey,
        config,
        collection,
        entryMap,
        field,
        collection.get('fields')!.toArray(),
        currentFolder,
      );

      if (fieldFolder !== null) {
        currentFolder = fieldFolder;
      }
    }
  }

  return currentFolder;
}

export function selectMediaFolder(
  config: CmsConfig,
  collection: Collection | null,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  const name = 'media_folder';
  let mediaFolder = config[name];

  const customFolder = hasCustomFolder(name, collection, entryMap?.get('slug'), field);

  if (customFolder) {
    const folder = evaluateFolder(name, config, collection!, entryMap, field);
    if (folder.startsWith('/')) {
      // return absolute paths as is
      mediaFolder = join(folder);
    } else {
      const entryPath = entryMap?.get('path');
      mediaFolder = entryPath
        ? join(dirname(entryPath), folder)
        : join(collection!.get('folder') as string, DRAFT_MEDIA_FILES);
    }
  }

  return trim(mediaFolder, '/');
}

export function selectMediaFilePath(
  config: CmsConfig,
  collection: Collection | null,
  entryMap: EntryMap | undefined,
  mediaPath: string,
  field: EntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) {
    return mediaPath;
  }

  const mediaFolder = selectMediaFolder(config, collection, entryMap, field);

  return join(mediaFolder, basename(mediaPath));
}

export function selectMediaFilePublicPath(
  config: CmsConfig,
  collection: Collection | null,
  mediaPath: string,
  entryMap: EntryMap | undefined,
  field: EntryField | undefined,
) {
  if (isAbsolutePath(mediaPath)) {
    return mediaPath;
  }

  const name = 'public_folder';
  let publicFolder = config[name]!;

  const customFolder = hasCustomFolder(name, collection, entryMap?.get('slug'), field);

  if (customFolder) {
    publicFolder = evaluateFolder(name, config, collection!, entryMap, field);
  }

  if (isAbsolutePath(publicFolder)) {
    return joinUrlPath(publicFolder, basename(mediaPath));
  }

  return join(publicFolder, basename(mediaPath));
}

export function selectEditingDraft(state: EntryDraft) {
  const entry = state.get('entry');
  const workflowDraft = entry && !entry.isEmpty();
  return workflowDraft;
}

// Pagination selectors
export function selectPaginationState(state: Entries, collection: string) {
  // Add defensive check for state structure
  if (!state || !state.get || !state.getIn) {
    return fromJS({
      currentPage: 1,
      pageSize: 8,
      totalEntries: 0,
      enabled: true,
      loadedCount: 0,
      totalAvailable: 0,
      isLoadingMore: false,
      hasMore: false,
    });
  }

  const paginationState = state.getIn(['pagination', collection]);
  if (!paginationState) {
    return fromJS({
      currentPage: 1,
      pageSize: 8,
      totalEntries: 0,
      enabled: true,
      loadedCount: 0,
      totalAvailable: 0,
      isLoadingMore: false,
      hasMore: false,
    });
  }
  return paginationState;
}

export function selectPaginationPageSize(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('pageSize') || 8;
}

export function selectPaginationCurrentPage(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('currentPage') || 1;
}

export function selectPaginationTotalEntries(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('totalEntries') || 0;
}

export function selectPaginationLoadedCount(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('loadedCount') || 0;
}

export function selectPaginationTotalAvailable(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('totalAvailable') || 0;
}

export function selectPaginationIsLoadingMore(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('isLoadingMore') || false;
}

export function selectPaginationHasMore(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('hasMore') || false;
}

export function selectPaginationEnabled(state: Entries, collection: string) {
  const paginationState = selectPaginationState(state, collection);
  return paginationState.get('enabled') !== false;
}

export function selectPaginatedEntries(state: Entries, collection: Collection) {
  // Get entries after sorting and filtering (the complete processed dataset)
  const processedEntries = selectEntries(state, collection);
  const collectionName = collection.get('name');
  const paginationEnabled = selectPaginationEnabled(state, collectionName);

  // If pagination is disabled, return all processed entries
  if (!paginationEnabled) {
    return processedEntries;
  }

  // Apply frontend pagination to the filtered/sorted results
  const pageSize = selectPaginationPageSize(state, collectionName);
  const currentPage = selectPaginationCurrentPage(state, collectionName);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return processedEntries.slice(startIndex, endIndex);
}

export function selectPaginationInfo(state: Entries, collection: string) {
  const pageSize = selectPaginationPageSize(state, collection);
  const currentPage = selectPaginationCurrentPage(state, collection);
  const totalEntries = selectPaginationTotalEntries(state, collection);
  const totalPages = Math.ceil(totalEntries / pageSize);

  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  return {
    pageSize,
    currentPage,
    totalEntries,
    totalPages,
    startEntry,
    endEntry,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export function selectPaginationInfoWithLoadingState(state: Entries, collection: string) {
  const basicInfo = selectPaginationInfo(state, collection);
  const loadedCount = selectPaginationLoadedCount(state, collection);
  const hasMore = selectPaginationHasMore(state, collection);

  return {
    ...basicInfo,
    loadedCount,
    hasMore,
  };
}

export function selectPaginationInfoWithFiltering(state: Entries, collection: Collection) {
  const collectionName = collection.get('name');
  const paginationEnabled = selectPaginationEnabled(state, collectionName);

  if (!paginationEnabled) {
    return selectPaginationInfo(state, collectionName);
  }

  // Get the basic pagination info first
  const basicPaginationInfo = selectPaginationInfo(state, collectionName);

  // Check if any filters are applied (sorting doesn't change total count)
  const filterFields = selectEntriesFilterFields(state, collectionName);
  const hasActiveFilters = (filterFields && filterFields.length > 0);

  // If no filters are active, use the basic pagination info (which uses totalEntries from pagination state)
  if (!hasActiveFilters) {
    return basicPaginationInfo;
  }

  // If filters are active, count the filtered entries and adjust the pagination info
  const filteredEntries = selectEntries(state, collection);
  const filteredTotal = filteredEntries ? filteredEntries.size : 0;

  const pageSize = basicPaginationInfo.pageSize;
  const currentPage = basicPaginationInfo.currentPage;
  const totalPages = Math.ceil(filteredTotal / pageSize);
  const startEntry = filteredTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, filteredTotal);

  return {
    ...basicPaginationInfo,
    totalEntries: filteredTotal,
    totalPages,
    startEntry,
    endEntry,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export default entries;
