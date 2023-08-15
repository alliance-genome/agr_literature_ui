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

    const pagination_elements = searchResultsCount ? (
      <Pagination>
        <Pagination.First  onClick={() => changePage('First')} />
        <Pagination.Prev   onClick={() => changePage('Prev')} />
        <Pagination.Item  disabled>{"Page " + (searchResultsPage) + " of " + Math.ceil(searchResultsCount/searchSizeResultsCount)}</Pagination.Item>
        <Pagination.Next   onClick={() => changePage('Next')} />
        <Pagination.Last   onClick={() => changePage('Last')} />
      </Pagination>
    ) : null

    function changePage(action){
      let page = searchResultsPage;
      let lastPage= Math.ceil(searchResultsCount/searchSizeResultsCount);
      switch (action){
        case 'Next':
          page=Math.min(lastPage,page+1);
          break;
        case 'Prev':
          page=Math.max(1,page-1);
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