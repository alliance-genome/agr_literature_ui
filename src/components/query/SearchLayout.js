import React from 'react';
import SearchBar from "./SearchBar";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Facets from './Facets';
import SearchResults from "./SearchResults";
import SearchOptions from "./SearchOptions";


const SearchLayout = () => {
    return (
        <div>
            <Container fluid>
                <Row>
                    <Col>
                        <SearchBar/>
                    </Col>
                </Row>
                <Row><Col>&nbsp;</Col></Row>
                <Row>
                    <Col>
                        <SearchOptions/>
                    </Col>
                </Row>
                <Row><Col>&nbsp;</Col></Row>
                <Row>
                    <Col>
                        <div style={{display: "flex"}}>
                            <div style={{maxWidth: "32em", flex: "1"}}>
                                <Facets/>
                            </div>
                            <div style={{flex: "1", }}>
                                <SearchResults/>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    )
}

export default SearchLayout;