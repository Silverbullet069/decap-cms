import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import partial from 'lodash/partial';
import { List } from 'immutable';
import { Cursor } from 'decap-cms-lib-util';
import { colors } from 'decap-cms-ui-default';

import {
  loadEntries as actionLoadEntries,
  traverseCollectionCursor as actionTraverseCollectionCursor,
} from '../../../actions/entries';
import {
  selectEntries,
  selectEntriesLoaded,
  selectIsFetching,
  selectGroups,
  selectPaginatedEntries,
  selectPaginationInfoWithLoadingState,
  selectPaginationEnabled,
  selectPaginationIsLoadingMore,
} from '../../../reducers/entries';
import { selectCollectionEntriesCursor } from '../../../reducers/cursors';
import Entries from './Entries';

const GroupHeading = styled.h2`
  font-size: 22px;
  font-weight: 600;
  line-height: 37px;
  padding-inline-start: 20px;
  color: ${colors.textLead};
`;

const GroupContainer = styled.div``;

function getGroupEntries(entries, paths) {
  return entries.filter(entry => paths.has(entry.get('path')));
}

function getGroupTitle(group, t) {
  const { label, value } = group;
  if (value === undefined) {
    return t('collection.groups.other');
  }
  if (typeof value === 'boolean') {
    return value ? label : t('collection.groups.negateLabel', { label });
  }
  return `${label} ${value}`.trim();
}

function withGroups(groups, entries, EntriesToRender, t) {
  return groups.map(group => {
    const title = getGroupTitle(group, t);
    return (
      <GroupContainer key={group.id} id={group.id}>
        <GroupHeading>{title}</GroupHeading>
        <EntriesToRender entries={getGroupEntries(entries, group.paths)} />
      </GroupContainer>
    );
  });
}

export class EntriesCollection extends React.Component {
  static propTypes = {
    collection: ImmutablePropTypes.map.isRequired,
    page: PropTypes.number,
    entries: ImmutablePropTypes.list,
    groups: PropTypes.array,
    isFetching: PropTypes.bool.isRequired,
    viewStyle: PropTypes.string,
    cursor: PropTypes.object.isRequired,
    loadEntries: PropTypes.func.isRequired,
    traverseCollectionCursor: PropTypes.func.isRequired,
    entriesLoaded: PropTypes.bool,
    paginationInfo: PropTypes.object,
    paginationEnabled: PropTypes.bool,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EntriesCollection.propTypes, this.props, 'prop', 'EntriesCollection');

    const { collection, entriesLoaded, loadEntries } = this.props;
    if (collection && !entriesLoaded) {
      loadEntries(collection);
    }
  }

  componentDidUpdate(prevProps) {
    const { collection, entriesLoaded, loadEntries, paginationInfo } = this.props;

    // Load entries if collection changed and not loaded
    if (collection !== prevProps.collection && !entriesLoaded) {
      loadEntries(collection);
    }

    // Check if we need to load more entries when pagination page changed
    if (paginationInfo && prevProps.paginationInfo &&
      paginationInfo.currentPage !== prevProps.paginationInfo.currentPage) {

      // Only load more entries if we don't have enough entries for the current page
      const currentPage = paginationInfo.currentPage;
      const pageSize = paginationInfo.pageSize;
      const requiredEntries = currentPage * pageSize;
      const loadedCount = paginationInfo.loadedCount || 0;

      // Load more entries if we need them for the current page
      if (requiredEntries > loadedCount && paginationInfo.hasMore) {
        loadEntries(collection, currentPage);
      }
    }
  }

  handleCursorActions = (cursor, action) => {
    const { collection, traverseCollectionCursor } = this.props;
    traverseCollectionCursor(collection, action);
  };

  render() {
    const { collection, entries, groups, isFetching, viewStyle, cursor, page, t } = this.props;

    const EntriesToRender = ({ entries }) => {
      return (
        <Entries
          collections={collection}
          entries={entries}
          isFetching={isFetching}
          collectionName={collection.get('label')}
          viewStyle={viewStyle}
          cursor={cursor}
          handleCursorActions={partial(this.handleCursorActions, cursor)}
          page={page}
        />
      );
    };

    if (groups && groups.length > 0) {
      return withGroups(groups, entries, EntriesToRender, t);
    }

    return <EntriesToRender entries={entries} />;
  }
}

export function filterNestedEntries(path, collectionFolder, entries, subfolders) {
  const filtered = entries.filter(e => {
    let entryPath = e.get('path').slice(collectionFolder.length + 1);
    if (!entryPath.startsWith(path)) {
      return false;
    }

    // for subdirectories, trim off the parent folder corresponding to
    // this nested collection entry
    if (path) {
      entryPath = entryPath.slice(path.length + 1);
    }

    // if subfolders legacy mode is enabled, show only immediate subfolders
    // also show index file in root folder
    if (subfolders) {
      const depth = entryPath.split('/').length;
      return path ? depth === 2 : depth <= 2;
    }

    // only show immediate children
    return !entryPath.includes('/');
  });
  return filtered;
}

function mapStateToProps(state, ownProps) {
  const { collection, viewStyle, filterTerm } = ownProps;

  // Add defensive checks for state structure
  if (!state || !state.entries || !collection) {
    return {
      collection,
      page: 1,
      entries: List(),
      groups: [],
      entriesLoaded: false,
      isFetching: false,
      viewStyle,
      cursor: Cursor.create({}),
      paginationInfo: {
        pageSize: 8,
        currentPage: 1,
        totalEntries: 0,
        totalPages: 0,
        startEntry: 0,
        endEntry: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        loadedCount: 0,
        hasMore: false,
      },
      paginationEnabled: true,
      isLoadingMore: false,
    };
  }

  const page = state.entries.getIn(['pages', collection.get('name'), 'page']);
  const paginationEnabled = selectPaginationEnabled(state.entries, collection.get('name'));
  const paginationInfo = selectPaginationInfoWithLoadingState(state.entries, collection.get('name'));
  const isLoadingMore = selectPaginationIsLoadingMore(state.entries, collection.get('name'));

  let entries;

  try {
    if (paginationEnabled) {
      // Use paginated entries when pagination is enabled
      entries = selectPaginatedEntries(state.entries, collection);
    } else {
      // Fall back to all entries when pagination is disabled
      entries = selectEntries(state.entries, collection);
    }

    if (collection.has('nested')) {
      const collectionFolder = collection.get('folder');
      entries = filterNestedEntries(
        filterTerm || '',
        collectionFolder,
        entries,
        collection.get('nested').get('subfolders') !== false,
      );
    }
  } catch (error) {
    console.error('Error in mapStateToProps:', error);
    entries = List();
  }

  const entriesLoaded = selectEntriesLoaded(state.entries, collection.get('name'));
  const isFetching = selectIsFetching(state.entries, collection.get('name'));

  const rawCursor = selectCollectionEntriesCursor(state.cursors, collection.get('name'));
  const cursor = Cursor.create(rawCursor).clearData();

  return {
    collection,
    page,
    entries,
    groups: selectGroups(state.entries, collection) || [],
    entriesLoaded,
    isFetching: isFetching || isLoadingMore,
    viewStyle,
    cursor,
    paginationInfo,
    paginationEnabled,
    isLoadingMore,
  };
}

const mapDispatchToProps = {
  loadEntries: actionLoadEntries,
  traverseCollectionCursor: actionTraverseCollectionCursor,
};

const ConnectedEntriesCollection = connect(mapStateToProps, mapDispatchToProps)(EntriesCollection);

export default translate()(ConnectedEntriesCollection);
