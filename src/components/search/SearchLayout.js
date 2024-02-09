import React from 'react';
import SearchBar from "./SearchBar";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Facets from './Facets';
import SearchResults from "./SearchResults";
import SearchOptions from "./SearchOptions";
import BreadCrumbs from "./BreadCrumbs";
import SearchPagination from "./SearchPagination";

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
                         <BreadCrumbs/>
                     </Col>
                 </Row>
                <Row><Col>&nbsp;</Col></Row>
                <Row>
                    <Col>
                        <div style={{display: "flex"}}>
                            <div style={{maxWidth: "32em", flex: "1", position: "sticky", top: "0px", alignSelf: "flex-start", zIndex: 1000}}>
                                <Facets/>
                            </div>
                            <div style={{flex: "3", marginLeft: "20px"}}>
                                <SearchResults/>
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row><Col sm={6}></Col><Col sm={4}><SearchPagination/></Col></Row>
            </Container>
        </div>
    )
}

export default SearchLayout;
