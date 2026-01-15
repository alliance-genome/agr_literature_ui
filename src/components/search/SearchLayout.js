import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from "./SearchBar";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Facets from './Facets';
import SearchResults from "./SearchResults";
import SearchOptions from "./SearchOptions";
import BreadCrumbs from "./BreadCrumbs";
import SearchPagination from "./SearchPagination";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

const MOBILE_BREAKPOINT = 992; // lg breakpoint

const SearchLayout = () => {
    const minWidth = 288;  // 18em = 288px (assuming 16px base)
    const maxWidth = 512;  // 32em = 512px
    const [facetWidth, setFacetWidth] = useState(minWidth);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const [facetsCollapsed, setFacetsCollapsed] = useState(window.innerWidth < MOBILE_BREAKPOINT);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);
            // Auto-collapse on mobile, but don't auto-expand when going to desktop
            if (mobile && !isMobile) {
                setFacetsCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

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

    const toggleFacets = useCallback(() => {
        setFacetsCollapsed(prev => !prev);
    }, []);

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col style={{ padding: 0 }}>
                        <SearchBar/>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                <Row>
                    <Col style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Filter toggle button for mobile */}
                        {isMobile && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={toggleFacets}
                                style={{ marginLeft: '10px' }}
                            >
                                <FontAwesomeIcon icon={faFilter} /> Filters
                            </Button>
                        )}
                        <div style={{ flex: 1 }}>
                            <SearchOptions/>
                        </div>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                <Row>
                    <Col style={{ padding: 0 }}>
                        <BreadCrumbs/>
                    </Col>
                </Row>
                <Row><Col style={{ padding: 0 }}>&nbsp;</Col></Row>
                {/* The flex container wrapping both the facet panel and search results */}
                <Row style={{ margin: 0 }}>
                    <Col style={{ padding: 0 }}>
                        <div style={{
                            display: "flex",
                            width: '100%',
                            position: 'relative'
                        }}>
                            {/* Facets Panel (scrollable) */}
                            <div style={{
                                width: isMobile ? '280px' : `${facetWidth}px`,
                                minWidth: isMobile ? '280px' : `${minWidth}px`,
                                maxWidth: isMobile ? '85vw' : `${maxWidth}px`,
                                position: isMobile ? "fixed" : "sticky",
                                top: isMobile ? "0" : "0px",
                                left: isMobile ? (facetsCollapsed ? '-100%' : '0') : 'auto',
                                zIndex: 1000,
                                height: "100vh",
                                overflowY: "auto",
                                backgroundColor: '#fff',
                                transition: isMobile ? 'left 0.3s ease-in-out' : 'none',
                                boxShadow: isMobile && !facetsCollapsed ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
                            }}>
                                {/* Close button for mobile facets */}
                                {isMobile && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px',
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: '#f8f9fa'
                                    }}>
                                        <strong>Filters</strong>
                                        <Button variant="link" onClick={toggleFacets} style={{ padding: 0 }}>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button>
                                    </div>
                                )}
                                <Facets/>
                            </div>

                            {/* Backdrop for mobile facets */}
                            {isMobile && !facetsCollapsed && (
                                <div
                                    onClick={toggleFacets}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                        zIndex: 999
                                    }}
                                />
                            )}

                            {/* Resize Handle: is out of scrollbar (desktop only) */}
                            {!isMobile && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: facetWidth - 3,
                                        top: 0,
                                        bottom: 0,
                                        width: '6px',
                                        cursor: 'col-resize',
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                        zIndex: 1001,
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseDown={() => setIsDragging(true)}
                                    onMouseEnter={() => document.body.style.userSelect = 'none'}
                                    onMouseLeave={() => document.body.style.userSelect = ''}
                                />
                            )}

                            {/* Search Results */}
                            <div style={{
                                flex: 1,
                                minWidth: 0,
                                position: 'relative',
                                margin: 0,
                                padding: 0,
                                marginLeft: isMobile ? 0 : undefined
                            }}>
                                <SearchResults/>
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}></Col>
                    <Col sm={4}><SearchPagination/></Col>
                </Row>
            </Container>
        </div>
    )
}

export default SearchLayout;
