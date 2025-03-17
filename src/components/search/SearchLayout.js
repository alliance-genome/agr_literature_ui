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
    const movementSensitivity = 10;
    const [facetWidth, setFacetWidth] = useState(minWidth);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const newWidth = facetWidth + (e.movementX / movementSensitivity);
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
            <Container fluid>
                {/* ... other rows remain unchanged ... */}
                <Row>
                    <Col style={{ padding: 0 }}>
                        <div style={{ 
                            display: "flex", 
                            alignItems: 'flex-start',
                            width: '100%' // Ensure full width
                        }}>
                            {/* Facets Panel */}
                            <div style={{
                                width: `${facetWidth}em`,
                                minWidth: `${minWidth}em`,
                                maxWidth: `${maxWidth}em`,
                                position: "sticky",
                                top: "0px",
                                zIndex: 1000,
                                maxHeight: "100vh",
                                overflowY: "auto",
                                backgroundColor: '#fff',
                                borderRight: '1px solid #ddd',
                                boxSizing: 'border-box'
                            }}>
                                <Facets/>
                                {/* Resize Handle */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        right: -3,
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
                            
                            {/* Search Results - Now flush adjacent */}
                            <div style={{ 
                                flex: 1,
                                minWidth: 0, // Crucial for proper flex behavior
                                position: 'relative',
                                overflow: 'hidden',
                                marginLeft: '-1px' // Compensate for border
                            }}>
                                <SearchResults/>
                            </div>
                        </div>
                    </Col>
                </Row>
                {/* ... pagination row remains the same ... */}
            </Container>
        </div>
    )
}

export default SearchLayout;
