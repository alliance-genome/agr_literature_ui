import React, { useState, useEffect } from 'react';
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
    const minWidth = 18;  // width in em
    const maxWidth = 32;
    const movementSensitity = 10; // change 10 to adjust sensitivity
    const [facetWidth, setFacetWidth] = useState(minWidth);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            // calculate new width based on mouse movement
            const newWidth = facetWidth + (e.movementX / movementSensitity);
            setFacetWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, facetWidth]);

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
                            <div style={{
                                width: `${facetWidth}em`,
                                minWidth: `${minWidth}em`,
                                maxWidth: `${maxWidth}em`,
                                flex: "none",
                                position: "sticky",
                                top: "0px",
                                alignSelf: "flex-start",
                                zIndex: 1000,
                                maxHeight: "100vh",
                                overflowY: "auto",
                                overflowX: "hidden",
                                position: 'relative',
                                backgroundColor: '#fff' // added for better visual separation
                            }}>
                                <Facets/>
                                {/* Resize Handle */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '6px',
                                        cursor: 'col-resize',
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                        zIndex: 1001,
                                        transition: 'background-color 0.2s',
                                        ':hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)'
                                        }
                                    }}
                                    onMouseDown={() => setIsDragging(true)}
                                    onMouseEnter={() => document.body.style.userSelect = 'none'}
                                    onMouseLeave={() => document.body.style.userSelect = ''}
                                />
                            </div>
                            <div style={{
                                flex: "3",
                                marginLeft: "20px",
                                minWidth: 0,
                                position: 'relative'
                            }}>
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
