import React from 'react';
import Form from 'react-bootstrap/Form';
import {searchReferences, setSearchSizeResultsCount, setSearchResultsPage, setSortByPublishedDate} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Pagination from 'react-bootstrap/Pagination';



const SearchOptions = () => {

    const searchResultsCount = useSelector(state => state.search.searchResultsCount);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
    const searchResultsPage  = useSelector(state => state.search.searchResultsPage);


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
        <Container fluid>
            <Row>
                <Col sm={2}>
                    <div className="div-grey-border">
                        {searchResultsCount > 0 ? searchResultsCount + " results": null}
                    </div>
                </Col>
                <Col sm={2}>
                    <Form.Control as="select" id="selectSizeResultsCount" name="selectSizeResultsCount"
                                  onChange={(e) => {
                                      dispatch(setSearchSizeResultsCount(e.target.value));
                                      dispatch(setSearchResultsPage(1));
                                      dispatch(searchReferences());
                                  } }>
                        <option value="10" >Results per page 10</option>
                        <option value="25" >Results per page 25</option>
                        <option value="50" selected>Results per page 50</option>
                        <option value="100" >Results per page 100</option>
                    </Form.Control>
                </Col>
                <Col sm={2}>
                    <Form.Control as="select" id="sortByPublishedDate" name="sortByPublishedDate"
                                  onChange={(e) => {
                                      dispatch(setSortByPublishedDate(e.target.value))
                                      dispatch(searchReferences());
                                  } }>
                        <option value="relevance" selected>Sort by relevance</option>
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                    </Form.Control>
                </Col>
                <Col sm={6}>
                  {pagination_elements}
                </Col>
                <Col sm={2}>
                </Col>
            </Row>
        </Container>
    )
}

export default SearchOptions;
