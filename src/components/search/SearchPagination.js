import React from 'react';
import {searchReferences,  setSearchResultsPage} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';
import Col from "react-bootstrap/Col";
import Pagination from 'react-bootstrap/Pagination';


const SearchPagination = () => {

    const searchResultsPage  = useSelector(state => state.search.searchResultsPage);
    const searchResultsCount = useSelector(state => state.search.searchResultsCount);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);

    const dispatch = useDispatch();

    const lastPage = Math.ceil(searchResultsCount/searchSizeResultsCount);

    const pagination_elements = searchResultsCount ? (
      <Pagination>
        <Pagination.First  onClick={() => changePage('First')} />
        <Pagination.Item   disabled={searchResultsPage - 5 < 1} onClick={() => changePage('Back5')}>-5</Pagination.Item>
        <Pagination.Prev   onClick={() => changePage('Prev')} />
        <Pagination.Item  disabled>{"Page " + (searchResultsPage) + " of " + lastPage.toLocaleString()}</Pagination.Item>
        <Pagination.Next   onClick={() => changePage('Next')} />
        <Pagination.Item   disabled={searchResultsPage + 5 > lastPage} onClick={() => changePage('Forward5')}>+5</Pagination.Item>
        <Pagination.Last   onClick={() => changePage('Last')} />
      </Pagination>
    ) : null

    function changePage(action){
      let page = searchResultsPage;
      switch (action){
        case 'Next':
          page=Math.min(lastPage,page+1);
          break;
        case 'Prev':
          page=Math.max(1,page-1);
          break;
        case 'Back5':
          page=Math.max(1,page-5);
          break;
        case 'Forward5':
          page=Math.min(lastPage,page+5);
          break;
        case 'First':
          page=1;
          break;
        case 'Last':
          page=lastPage;
          break;
        default:
          page=1;
          break;

      }
      dispatch(setSearchResultsPage(page));
      dispatch(searchReferences());
    }

    return (
      <Col  >

                {pagination_elements}

      </Col>
    )
}

export default SearchPagination;