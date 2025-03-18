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
    const minWidth = 288;  // 18em = 288px (assuming 16px base)
    const maxWidth = 512;  // 32em = 512px
    const movementSensitivity = 5; // More precise control
    const [facetWidth, setFacetWidth] = useState(minWidth);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const newWidth = facetWidth + e.movementX;
            setFacetWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.userSelect = '';
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
            <Container fluid style={{ padding: 0 }}>
                <Row>
                    <Col style={{ padding: 0 }}>
                        <SearchBar/>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                <Row>
                    <Col style={{ padding: 0 }}>
                        <SearchOptions/>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                <Row>
                    <Col style={{ padding: 0 }}>
                        <BreadCrumbs/>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                <Row style={{ margin: 0 }}>
                    <Col style={{ padding: 0 }}>
                        <div style={{ 
                            display: "flex", 
                            width: '100%',
                            position: 'relative'
                        }}>
                            {/* Facets Panel */}
                            <div style={{
                                width: `${facetWidth}px`,
                                minWidth: `${minWidth}px`,
                                maxWidth: `${maxWidth}px`,
                                position: "sticky",
                                top: "0px",
                                zIndex: 1000,
                                height: "100vh",
                                overflowY: "auto",
                                backgroundColor: '#fff',
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
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            width: '8px'
                                        }
                                    }}
                                    onMouseDown={() => setIsDragging(true)}
                                    onMouseEnter={() => document.body.style.userSelect = 'none'}
                                    onMouseLeave={() => document.body.style.userSelect = ''}
                                />
                            </div>
                            
                            {/* Search Results - Now Flush Adjacent */}
                            <div style={{ 
                                flex: 1,
                                minWidth: 0,
                                position: 'relative',
				margin: 0,
				padding: 0
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
