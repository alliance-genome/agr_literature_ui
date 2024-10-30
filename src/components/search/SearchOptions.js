import React from 'react';
import Form from 'react-bootstrap/Form';
import {searchReferences, setSearchSizeResultsCount, setSearchResultsPage, setSortByPublishedDate} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import SearchPagination from "./SearchPagination";



const SearchOptions = () => {

    const searchResultsCount = useSelector(state => state.search.searchResultsCount);
    const dispatch = useDispatch();




    return (
        <Container fluid>
            <Row>
                <Col sm={2}>
                    <div className="div-grey-border">
                        {searchResultsCount > 0 ? searchResultsCount.toLocaleString() + " results": null}
                    </div>
                </Col>
                <Col sm={2}>
                    <Form.Control as="select" id="selectSizeResultsCount" name="selectSizeResultsCount" defaultValue="50"
                                  onChange={(e) => {
                                      dispatch(setSearchSizeResultsCount(e.target.value));
                                      dispatch(setSearchResultsPage(1));
                                      dispatch(searchReferences());
                                  } }>
                        <option value="10" >Results per page 10</option>
                        <option value="25" >Results per page 25</option>
                        <option value="50" >Results per page 50</option>
                        <option value="100" >Results per page 100</option>
                    </Form.Control>
                </Col>
                <Col sm={2}>
                    <Form.Control as="select" id="sortByPublishedDate" name="sortByPublishedDate" defaultValue="relevance"
                                  onChange={(e) => {
                                      dispatch(setSortByPublishedDate(e.target.value))
                                      dispatch(searchReferences());
                                  } }>
                        <option value="relevance">Sort by relevance</option>
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                    </Form.Control>
                </Col>
                <Col  sm={4}>
                  <Row><Col><SearchPagination/></Col></Row>
                </Col>
                <Col sm={2}>
                </Col>
            </Row>
        </Container>
    )
}

export default SearchOptions;
