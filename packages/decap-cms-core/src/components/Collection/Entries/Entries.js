import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { translate } from 'react-polyglot';
import { Loader, lengths } from 'decap-cms-ui-default';

import EntryListing from './EntryListing';

const PaginationMessage = styled.div`
  width: ${lengths.topCardWidth};
  padding: 16px;
  text-align: center;
`;

const NoEntriesMessage = styled(PaginationMessage)`
  margin-top: 16px;
`;

function Entries({
  collections,
  entries,
  isFetching,
  viewStyle,
  t,
}) {
  const loadingMessages = [
    t('collection.entries.loadingEntries'),
    t('collection.entries.cachingEntries'),
    t('collection.entries.longerLoading'),
  ];

  if (isFetching) {
    return <Loader active>{loadingMessages}</Loader>;
  }

  const hasEntries = entries && entries.size > 0;
  if (hasEntries) {
    return (
      <EntryListing
        collections={collections}
        entries={entries}
        viewStyle={viewStyle}
      />
    );
  }

  return <NoEntriesMessage>{t('collection.entries.noEntries')}</NoEntriesMessage>;
}

Entries.propTypes = {
  collections: ImmutablePropTypes.iterable.isRequired,
  entries: ImmutablePropTypes.list,
  isFetching: PropTypes.bool,
  viewStyle: PropTypes.string,
  t: PropTypes.func.isRequired,
};

export default translate()(Entries);
