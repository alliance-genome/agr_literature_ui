import React from 'react';
import Form from 'react-bootstrap/Form';
import {searchReferences, setSearchSizeResultsCount} from '../../actions/queryActions';
import {useDispatch, useSelector} from 'react-redux';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";


const SearchOptions = () => {

    const searchQuery = useSelector(state => state.query.searchQuery);
    const searchFacetsValues = useSelector(state => state.query.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.query.searchFacetsLimits);
    const searchResultsCount = useSelector(state => state.query.searchResultsCount);

    const dispatch = useDispatch();

    return (
        <Container fluid>
            <Row>
                <Col sm={2}>
                  {searchResultsCount > 0 ?
                        <div className="div-grey-border">{searchResultsCount} results</div> :
                        <div className="div-grey-border"></div>
                  }
                </Col>
                <Col sm={2}>
                    <Form.Control as="select" id="selectSizeResultsCount" name="selectSizeResultsCount"
                                  onChange={(e) => {
                                      const intSizeResultsCount = parseInt(e.target.value.replace('Results per page ', ''));
                                      dispatch(setSearchSizeResultsCount(intSizeResultsCount));
                                      dispatch(searchReferences(searchQuery, searchFacetsValues, searchFacetsLimits, intSizeResultsCount));
                                  } }>
                        <option>Results per page 10</option>
                        <option>Results per page 25</option>
                        <option>Results per page 50</option>
                    </Form.Control>
                </Col>
                <Col sm={8}>
                </Col>
            </Row>
        </Container>
    )
}

export default SearchOptions;
