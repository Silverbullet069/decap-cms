import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { Icon, buttons, colors } from 'decap-cms-ui-default';

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PageButton = styled.button`
  ${buttons.button};
  ${buttons.medium};
  ${buttons.gray};
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:disabled {
    background: ${colors.background};
    color: ${colors.text};
    cursor: default;
    opacity: 0.7;
  }
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: ${colors.textLead};
  min-width: 60px;
  text-align: center;
  font-weight: 500;
`;

function PaginationControl({
  startEntry,
  endEntry,
  totalEntries,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  currentPage,
  isLoadingMore,
  t
}) {
  return (
    <PaginationContainer>
      <PageButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage || isLoadingMore}
        title={t('collection.pagination.previousPage')}
      >
        <Icon type="chevron" direction="left" size="small" />
      </PageButton>

      <PageInfo>
        {isLoadingMore ? (
          t('collection.pagination.loading')
        ) : totalEntries === 0 ? (
          t('collection.pagination.noEntries')
        ) : (
          t('collection.pagination.pageInfo', {
            start: startEntry,
            end: endEntry,
            total: totalEntries
          })
        )}
      </PageInfo>

      <PageButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage || isLoadingMore}
        title={t('collection.pagination.nextPage')}
      >
        <Icon type="chevron" direction="right" size="small" />
      </PageButton>
    </PaginationContainer>
  );
}

PaginationControl.propTypes = {
  startEntry: PropTypes.number.isRequired,
  endEntry: PropTypes.number.isRequired,
  totalEntries: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  hasPreviousPage: PropTypes.bool.isRequired,
  onPageChange: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  isLoadingMore: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default translate()(PaginationControl);
