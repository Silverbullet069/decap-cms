import React from 'react';
import PropTypes from 'prop-types';
import { Loader } from 'decap-cms-ui-default';
import { translate } from 'react-polyglot';

function Spinner({ collection, message, t }) {
  const defaultMessage = collection
    ? `${t('collection.entries.loadingEntries')} for ${collection}`
    : t('collection.entries.loadingEntries');
  const loadingMessage = message || defaultMessage;

  return <Loader active>{loadingMessage}</Loader>;
}

Spinner.propTypes = {
  collection: PropTypes.string.isRequired,
  message: PropTypes.string,
  t: PropTypes.func.isRequired,
};

Spinner.defaultProps = {
  message: null,
};

export default translate()(Spinner);
