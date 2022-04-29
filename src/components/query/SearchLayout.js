import React from 'react';
import SearchBar from "./SearchBar";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Facets from './Facets';
import SearchResults from "./SearchResults";


const SearchLayout = () => {
    return (
        <div>
            <Container fluid>
                <Row>
                    <Col>
                        <SearchBar/>
                    </Col>
                </Row>
                <Row>
                    <Col sm={3}>
                        <Facets/>
                    </Col>
                    <Col sm={9}>
                        <SearchResults/>
                    </Col>
                </Row>
            </Container>
        </div>
    )
}

export default SearchLayout;