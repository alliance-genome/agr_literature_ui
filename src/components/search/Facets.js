import React, {useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
    addFacetValue,
    fetchInitialFacets,
    removeFacetValue,
    searchReferences,
    setSearchFacetsLimits
} from '../../actions/searchActions';
import Form from 'react-bootstrap/Form';
import {Accordion, Badge, Button} from 'react-bootstrap';
import {IoIosArrowDroprightCircle, IoIosArrowDropdownCircle} from 'react-icons/io';
import {INITIAL_FACETS_LIMIT} from '../../reducers/searchReducer';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import _ from "lodash";

const Facet = ({facetsToInclude, renameFacets}) => {

    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const dispatch = useDispatch();

    return (
        <div>
            {Object.entries(searchFacets).filter(([key, value]) =>
                facetsToInclude.includes(key.replace('.keyword', '').replaceAll('_', ' ')))
                .map(([key, value]) =>
                    <div key={key} style={{textAlign: "left", paddingLeft: "2em"}}>
                        <div>
                            <h5>{renameFacets.hasOwnProperty(key) ? renameFacets[key] : key.replace('.keyword', '').replaceAll('_', ' ')}</h5>
                            {value.buckets.map(bucket =>
                                <Container key={bucket.key}>
                                    <Row>
                                        <Col sm={1}>
                                            <Form.Check inline type="checkbox"
                                                        checked={searchFacetsValues.hasOwnProperty(key) && searchFacetsValues[key].includes(bucket.key)}
                                                        onChange={(evt) => {
                                                            if (evt.target.checked) {
                                                                dispatch(addFacetValue(key, bucket.key));
                                                            } else {
                                                                dispatch(removeFacetValue(key, bucket.key));
                                                            }
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
                            <ShowMoreLessAllButtons facetLabel={key} facetValue={value} />
                            <br/>
                        </div>
                    </div>
                )}
        </div>
    )
}

const ShowMoreLessAllButtons = ({facetLabel, facetValue}) => {

    const searchQuery = useSelector(state => state.search.searchQuery);
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const dispatch = useDispatch();

    const searchOrSetInitialFacets = (newSearchFacetsLimits) => {
        if (searchQuery !== null || Object.keys(searchFacetsValues).length !== 0) {
            dispatch(searchReferences(searchQuery, searchFacetsValues, newSearchFacetsLimits, searchSizeResultsCount))
        } else {
            dispatch(fetchInitialFacets(newSearchFacetsLimits));
        }
    }

    return (
        <div style={{paddingLeft: "1em"}}>
            {facetValue.buckets.length >= searchFacetsLimits[facetLabel] ?
                <button className="button-to-link" onClick={()=> {
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] * 2;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    searchOrSetInitialFacets(newSearchFacetsLimits);
                }}>+Show More</button> : null
            }
            {searchFacetsLimits[facetLabel] > INITIAL_FACETS_LIMIT ?
                <span>&nbsp;&nbsp;&nbsp;&nbsp;<button className="button-to-link" onClick={() => {
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] = INITIAL_FACETS_LIMIT;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    searchOrSetInitialFacets(newSearchFacetsLimits);
                }}>-Show Less</button></span> : null
            }
            {facetValue.buckets.length >= searchFacetsLimits[facetLabel] ? <span>&nbsp;&nbsp;&nbsp;&nbsp;
                <button className="button-to-link" onClick={() =>{
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] = 1000;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    searchOrSetInitialFacets(newSearchFacetsLimits);
                }}>+Show All</button></span> : null } </div>
    )
}


const Facets = () => {

    const [openFacets, setOpenFacets] = useState(new Set());
    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const searchQuery = useSelector(state => state.search.searchQuery);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
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
        } else if (searchQuery !== undefined || Object.keys(searchFacetsValues).length > 0) {
            dispatch(searchReferences(searchQuery, searchFacetsValues, searchFacetsLimits, searchSizeResultsCount));
        }
    }, [searchFacetsValues]);

    return (
        <Accordion style={{textAlign: "left"}}>
            <div>
                <Accordion.Toggle as={Button} variant="light" size="lg" eventKey="0"
                                  onClick={() => toggleFacetGroup('Bibliographic Data')}>
                    {openFacets.has('Bibliographic Data') ? <IoIosArrowDropdownCircle/> : <IoIosArrowDroprightCircle/>} Bibliographic Data
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="0">
                    <div>
                        <Facet facetsToInclude={["pubmed types", "category", "pubmed publication status"]}
                               renameFacets={{"category.keyword": "alliance category"}}/>
                    </div>
                </Accordion.Collapse>
            </div>
        </Accordion>
    )
}

export default Facets;
