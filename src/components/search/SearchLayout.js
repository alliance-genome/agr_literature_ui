import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import SearchBar from "./SearchBar";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Facets from './Facets';
import SearchResults from "./SearchResults";
import SearchOptions from "./SearchOptions";
import BreadCrumbs from "./BreadCrumbs";
import SearchPagination from "./SearchPagination";
import TetValidationGrid from '../refs_tet_validation/TetValidationGrid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronLeft,
    faChevronRight,
    faListUl,
    faThLarge,
} from '@fortawesome/free-solid-svg-icons';

const MOBILE_BREAKPOINT = 992; // lg breakpoint

const SearchLayout = () => {
    const minWidth = 288;  // 18em = 288px (assuming 16px base)
    const maxWidth = 512;  // 32em = 512px
    const [facetWidth, setFacetWidth] = useState(minWidth);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startWidth: 0 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const [facetsCollapsed, setFacetsCollapsed] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const [view, setView] = useState('list'); // 'list' | 'grid'
    const [hasOpenedTopicGrid, setHasOpenedTopicGrid] = useState(false);

    // Persisted topic-grid UI state — topic/source multiselects, the display
    // checkboxes and the ID-prefix filter. The grid is torn down on every
    // search (results are cleared while loading), which would otherwise reset
    // every toolbar choice on each pagination/filter change. Holding the state
    // in a ref here keeps it across searches without re-rendering SearchLayout;
    // it resets only when the topic facet changes (handled inside the grid via
    // the topics-prop key) or on a page refresh (this component remounts).
    const gridStateRef = useRef({});

    const searchResults = useSelector((s) => s.search.searchResults);
    const searchFacetsValues = useSelector((s) => s.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector((s) => s.search.searchExcludedFacetsValues);
    const confidenceScore = useSelector((s) => s.search.confidenceScore);
    const applyToSingleTag = useSelector((s) => s.search.applyToSingleTag);
    const searchLoading = useSelector((s) => s.search.searchLoading);

    const referenceIds = useMemo(
        () => (searchResults || []).map((r) => r.curie).filter(Boolean),
        [searchResults]
    );
    // Reuse the biblio data the search already returned (curie/title/authors/
    // cross_references/date_published) so the grid can skip the per-row
    // /reference/{curie} fetch. Keyed by canonical AGRKB curie.
    const biblioByCurie = useMemo(() => {
        const map = {};
        for (const r of searchResults || []) {
            if (r?.curie) map[r.curie] = r;
        }
        return map;
    }, [searchResults]);
    const topicsForGrid = useMemo(() => {
        const arr = searchFacetsValues?.topics;
        if (!Array.isArray(arr) || arr.length === 0) return undefined;
        // searchFacetsValues.topics is always a list of ATP curies (the bucket.key
        // values from the topic aggregation); display names are looked up by the
        // grid via /ontology/map_curie_to_name/atpterm/{curie}.
        return arr.map((curie) => ({ curie, name: undefined }));
    }, [searchFacetsValues]);
    // Confidence levels the user excluded (e.g. ['NEG']). The Topic grid fetches
    // TETs independently of the search query, so it must apply the same
    // "Exclude NEG" filter itself to avoid showing negative data the search hid.
    const excludedConfidenceLevels = useMemo(
        () => searchExcludedFacetsValues?.confidence_levels || [],
        [searchExcludedFacetsValues]
    );
    // The TET facet criteria from the current search, forwarded to the grid's
    // batch fetch so the API returns ONLY the tags the search asked for (e.g.
    // when a curator selects a topic/entity) instead of every tag on every
    // reference. This is the main fix for the slow grid load. Mirrors the TET
    // facets the search itself sends in searchActions.js. Confidence-score is
    // sent only when it differs from the default full range [0, 1].
    const searchFilters = useMemo(() => {
        const fv = searchFacetsValues || {};
        const neg = searchExcludedFacetsValues || {};
        const nonEmpty = (a) => Array.isArray(a) && a.length > 0;
        const f = {};
        if (nonEmpty(fv.topics)) f.topics = fv.topics;
        if (nonEmpty(fv.confidence_levels)) f.confidence_levels = fv.confidence_levels;
        if (nonEmpty(fv.source_methods)) f.source_methods = fv.source_methods;
        if (nonEmpty(fv.source_evidence_assertions)) f.source_evidence_assertions = fv.source_evidence_assertions;
        if (nonEmpty(fv.data_novelty)) f.data_novelty = fv.data_novelty;
        if (nonEmpty(fv.entity_types)) f.entity_types = fv.entity_types;
        if (nonEmpty(fv.entities)) f.entities = fv.entities;
        if (nonEmpty(neg.confidence_levels)) f.negated_confidence_levels = neg.confidence_levels;
        if (nonEmpty(neg.source_methods)) f.negated_source_methods = neg.source_methods;
        if (nonEmpty(neg.source_evidence_assertions)) f.negated_source_evidence_assertions = neg.source_evidence_assertions;
        if (Array.isArray(confidenceScore) && !(confidenceScore[0] === 0 && confidenceScore[1] === 1)) {
            f.confidence_score_min = confidenceScore[0];
            f.confidence_score_max = confidenceScore[1];
        }
        if (Object.keys(f).length === 0) return undefined;
        // Mirror the search's single/multi-tag mode so the API combines the
        // positive nested-TET facets the same way: single-tag => one tag must
        // satisfy all of them; multi-tag => the search matched them across
        // different tags, so the grid must OR them or a genuine search hit would
        // show an empty row. Use the SAME truthiness test searchActions.js uses
        // to pick processCombinedTETFacets (truthy) vs processSingleFacet
        // (falsy), so the flag always matches the ES query path actually taken
        // (the reducer defaults applyToSingleTag to true).
        f.apply_to_single_tag = !!applyToSingleTag;
        return f;
    }, [searchFacetsValues, searchExcludedFacetsValues, confidenceScore, applyToSingleTag]);

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
            const { startX, startWidth } = dragRef.current;
            const newWidth = startWidth + (e.clientX - startX);
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
    }, [isDragging]);

    useEffect(() => {
        if (view === 'grid') {
            setHasOpenedTopicGrid(true);
        }
    }, [view]);

    const toggleFacets = useCallback(() => {
        setFacetsCollapsed(prev => !prev);
    }, []);

    const shouldRenderTopicGrid =
        referenceIds.length > 0 && (view === 'grid' || hasOpenedTopicGrid);

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
                {/* The flex container wrapping both the facet panel and search results */}
                <Row style={{ margin: 0 }}>
                    <Col style={{ padding: 0 }}>
                        {facetsCollapsed && (
                            <div style={{
                                padding: '0 0 6px 0',
                                backgroundColor: '#fff',
                                textAlign: 'left',
                                animation: 'facetToggleFadeIn 180ms ease-out',
                            }}>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={toggleFacets}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    <FontAwesomeIcon icon={faChevronRight} /> Show facets
                                </Button>
                            </div>
                        )}
                        <div style={{
                            display: "flex",
                            width: '100%',
                            position: 'relative'
                        }}>
                            {/* Facets Panel (scrollable). Keep Facets mounted when
                                hidden; remounting it retriggers facet searches. */}
                            <div style={{
                                width: !isMobile && facetsCollapsed ? '0px' : (isMobile ? '280px' : `${facetWidth}px`),
                                minWidth: !isMobile && facetsCollapsed ? '0px' : (isMobile ? '280px' : `${minWidth}px`),
                                maxWidth: !isMobile && facetsCollapsed ? '0px' : (isMobile ? '85vw' : `${maxWidth}px`),
                                position: isMobile ? "fixed" : "sticky",
                                top: isMobile ? "0" : "0px",
                                left: isMobile ? (facetsCollapsed ? '-100%' : '0') : 'auto',
                                zIndex: 1000,
                                height: "100vh",
                                overflowY: !isMobile && facetsCollapsed ? "hidden" : "auto",
                                overflowX: "hidden",
                                backgroundColor: '#fff',
                                transition: isMobile
                                    ? 'left 0.3s ease-in-out'
                                    : 'width 220ms ease, min-width 220ms ease, max-width 220ms ease, opacity 160ms ease',
                                boxShadow: isMobile && !facetsCollapsed ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
                                opacity: !isMobile && facetsCollapsed ? 0 : 1,
                                pointerEvents: !isMobile && facetsCollapsed ? 'none' : 'auto',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 10px',
                                    borderBottom: '1px solid #eee',
                                    backgroundColor: '#f8f9fa',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
                                }}>
                                    <strong>Facets</strong>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={toggleFacets}
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} /> Hide
                                    </Button>
                                </div>
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
                            {!isMobile && !facetsCollapsed && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: facetWidth,
                                        top: 0,
                                        bottom: 0,
                                        width: '6px',
                                        cursor: 'col-resize',
                                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                        zIndex: 1001,
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseDown={(e) => {
                                        dragRef.current = { startX: e.clientX, startWidth: facetWidth };
                                        setIsDragging(true);
                                        document.body.style.userSelect = 'none';
                                    }}
                                    onMouseEnter={() => { if (!isDragging) document.body.style.userSelect = 'none'; }}
                                    onMouseLeave={() => { if (!isDragging) document.body.style.userSelect = ''; }}
                                />
                            )}

                            {/* Search Results / topic grid */}
                            <div style={{
                                flex: 1,
                                minWidth: 0,
                                position: 'relative',
                                margin: 0,
                                padding: 0,
                                marginLeft: isMobile ? 0 : undefined
                            }}>
                                {referenceIds.length > 0 && (
                                    <div className="tetv-view-switchbar">
                                        <ToggleButtonGroup
                                            type="radio"
                                            name="tetv-view"
                                            value={view}
                                            onChange={setView}
                                            size="sm"
                                            className="tetv-view-toggle"
                                        >
                                            <ToggleButton id="tetv-view-list" value="list" variant="outline-secondary">
                                                <FontAwesomeIcon icon={faListUl} /> List view
                                            </ToggleButton>
                                            <ToggleButton id="tetv-view-grid" value="grid" variant="outline-secondary">
                                                <FontAwesomeIcon icon={faThLarge} /> Topic grid
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </div>
                                )}
                                <div style={{ display: view === 'list' ? 'block' : 'none' }}>
                                    <SearchResults/>
                                </div>
                                {shouldRenderTopicGrid && (
                                    <div
                                        style={{
                                            display: view === 'grid' && !searchLoading ? 'block' : 'none',
                                        }}
                                    >
                                        <TetValidationGrid
                                            referenceIds={referenceIds}
                                            topics={topicsForGrid}
                                            excludedConfidenceLevels={excludedConfidenceLevels}
                                            confidenceScore={confidenceScore}
                                            biblioByCurie={biblioByCurie}
                                            searchFilters={searchFilters}
                                            active={view === 'grid'}
                                            persistRef={gridStateRef}
                                        />
                                    </div>
                                )}
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
