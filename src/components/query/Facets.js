import React, {useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fetchInitialFacets, searchReferences} from '../../actions/queryActions';
import Form from 'react-bootstrap/Form';
import {Accordion, Badge, Button} from 'react-bootstrap';
import {IoIosArrowDroprightCircle, IoIosArrowDropdownCircle} from 'react-icons/io';
import {INITIAL_FACETS_LIMIT} from '../../reducers/queryReducer';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const Facet = ({facetsToInclude}) => {

    const searchFacets = useSelector(state => state.query.searchFacets);
    const searchQuery = useSelector(state => state.query.searchQuery);
    const searchFacetsValues = useSelector(state => state.query.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.query.searchFacetsLimits);
    const searchSizeResultsCount = useSelector(state => state.query.searchSizeResultsCount);
    const dispatch = useDispatch();

    const searchWithUpdatedFacetsLimits = (newSearchFacetsLimits) => {
        if (searchQuery !== null || Object.keys(searchFacetsValues).length !== 0) {
            dispatch(searchReferences(searchQuery, searchFacetsValues, newSearchFacetsLimits, searchSizeResultsCount))
        } else {
            dispatch(fetchInitialFacets(newSearchFacetsLimits));
        }
    }

    return (
        <div>
            {Object.entries(searchFacets).filter(([key, value]) =>
                facetsToInclude.includes(key.replace('.keyword', '').replace('_', ' ')))
                .map(([key, value]) =>
                    <div key={key} style={{textAlign: "left", paddingLeft: "2em"}}>
                        <div>
                            <h5>{key.replace('.keyword', '').replace('_', ' ')}</h5>
                            {value.buckets.map(bucket =>
                                <Container key={bucket.key}>
                                    <Row>
                                        <Col sm={1}>
                                            <Form.Check inline type="checkbox"
                                                        checked={searchFacetsValues.hasOwnProperty(key) && searchFacetsValues[key].includes(bucket.key)}
                                                        onChange={(evt) => {
                                                            let newSearchFacetsValues = searchFacetsValues;
                                                            if (evt.target.checked) {
                                                                if (!newSearchFacetsValues.hasOwnProperty(key)) {
                                                                    newSearchFacetsValues[key] = []
                                                                }
                                                                newSearchFacetsValues[key].push(bucket.key)
                                                            } else {
                                                                newSearchFacetsValues[key] = newSearchFacetsValues[key].filter(
                                                                    e => e !== bucket.key)
                                                                if (newSearchFacetsValues[key].length === 0) {
                                                                    delete newSearchFacetsValues[key];
                                                                }
                                                            }
                                                            dispatch(searchReferences(searchQuery, newSearchFacetsValues, searchFacetsLimits, searchSizeResultsCount));
                                                        }}/>
                                        </Col>
                                        <Col sm={8}>
                                            {bucket.key}
                                        </Col>
                                        <Col>
                                            <Badge variant="secondary">{bucket.doc_count}</Badge>
                                        </Col>
                                    </Row>
                                </Container>)}
                            <div style={{paddingLeft: "1em"}}>
                                <button className="button-to-link" onClick={()=> {
                                    let newSearchFacetsLimits = searchFacetsLimits;
                                    newSearchFacetsLimits[key] = searchFacetsLimits[key] * 2;
                                    searchWithUpdatedFacetsLimits(newSearchFacetsLimits);
                                }}>+Show More</button>
                                {searchFacetsLimits[key] > INITIAL_FACETS_LIMIT ?
                                    <span>&nbsp;&nbsp;&nbsp;&nbsp;<button className="button-to-link" onClick={() => {
                                        let newSearchFacetsLimits = searchFacetsLimits;
                                        newSearchFacetsLimits[key] = searchFacetsLimits[key] = INITIAL_FACETS_LIMIT;
                                        searchWithUpdatedFacetsLimits(newSearchFacetsLimits);
                                    }}>-Show Less</button></span> : null
                                }
                                &nbsp;&nbsp;&nbsp;&nbsp; <button className="button-to-link" onClick={() =>{
                                    let newSearchFacetsLimits = searchFacetsLimits;
                                        newSearchFacetsLimits[key] = searchFacetsLimits[key] = 1000;
                                        searchWithUpdatedFacetsLimits(newSearchFacetsLimits);
                            }}>+Show All</button></div>
                        </div>
                    </div>
                )}
        </div>
    )
}


const Facets = () => {

    const [openFacets, setOpenFacets] = useState(new Set());
    const searchFacets = useSelector(state => state.query.searchFacets);
    const searchFacetsLimits = useSelector(state => state.query.searchFacetsLimits);
    const dispatch = useDispatch();

    const toggleFacetGroup = (facetGroupLabel) => {
        let newOpenFacets = new Set([...openFacets]);
        if (newOpenFacets.has(facetGroupLabel)) {
            newOpenFacets.delete(facetGroupLabel);
        } else {
            newOpenFacets.add(facetGroupLabel);
        }
        setOpenFacets(newOpenFacets);
    }

    useEffect(() => {
        if (Object.keys(searchFacets).length === 0) {
            dispatch(fetchInitialFacets(searchFacetsLimits));
        }
    }, [])

    return (
        <Accordion style={{textAlign: "left"}}>
            <div>
                <Accordion.Toggle as={Button} variant="light" size="lg" eventKey="0"
                                  onClick={() => toggleFacetGroup('Bibliographic Data')}>
                    {openFacets.has('Bibliographic Data') ? <IoIosArrowDropdownCircle/> : <IoIosArrowDroprightCircle/>} Bibliographic Data
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="0">
                    <div>
                        <Facet facetsToInclude={["pubmed types"]}/>
                    </div>
                </Accordion.Collapse>
            </div>
        </Accordion>
    )
}

export default Facets;
