import React, {useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
    addFacetValue,
    addExcludedFacetValue,
    removeExcludedFacetValue,
    fetchInitialFacets,
    removeFacetValue,
    searchReferences,
    setSearchFacetsLimits,
    setSearchResultsPage,
    setAuthorFilter,
    filterFacets,
    setDatePubmedAdded,
    setDatePubmedModified,
    setDatePublished,
    setDateCreated,
    setModPreferencesLoaded,
    setApplyToSingleTag,
    removeDatePubmedAdded,
    removeDatePubmedModified,
    removeDatePublished,
    removeDateCreated
} from '../../actions/searchActions';
import Form from 'react-bootstrap/Form';
import {Badge, Button, Collapse, ButtonGroup, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {IoIosArrowDroprightCircle, IoIosArrowDropdownCircle} from 'react-icons/io';
import {INITIAL_FACETS_LIMIT} from '../../reducers/searchReducer';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from 'react-bootstrap/InputGroup';
import _ from "lodash";
import DateRangePicker from '@wojtekmaj/react-daterange-picker'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';
import LoadingOverlay from "../LoadingOverlay";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheckSquare, faMinusSquare} from "@fortawesome/free-solid-svg-icons";

export const RENAME_FACETS = {
    "category.keyword": "alliance category",
    "mods_in_corpus.keyword": "corpus - in corpus",
    "mods_needs_review.keyword": "corpus - needs review",
    "mods_in_corpus_or_needs_review.keyword": "corpus - in corpus or needs review",
    "authors.name.keyword": "Authors",
    "mod_reference_types.keyword": "MOD reference type",
    "topics": "Topic",
    "confidence_levels": "Confidence level",
    "source_methods": "Source method",
    "source_evidence_assertions": "Source evidence assertion",
    "file_workflow": "File workflow",
    "reference_classification": "Reference classification",
    "entity_extraction": "Entity extraction",
    "manual_indexing": "Manual indexing",
    "datePubmedAdded": {
        label: "Date Range: Added to PubMed",
        value: (state) => state.search.datePubmedAdded,
        action: removeDatePubmedAdded
    },
    "datePubmedModified": {
        label: "Date Range: Modified in PubMed",
        value: (state) => state.search.datePubmedModified,
        action: removeDatePubmedModified
    },
    "datePublished": {
        label: "Date Range: Published",
        value: (state) => state.search.datePublished,
        action: removeDatePublished
    },
    "dateCreated": {
        label: "Date Range: Added to ABC",
        value: (state) => state.search.dateCreated,
        action: removeDateCreated
    }
}


export const FACETS_CATEGORIES_WITH_FACETS = {
    "Alliance Metadata": ["mods in corpus", "mods needs review", "mods in corpus or needs review"],
    "Workflow Tags": ["file_workflow", "reference_classification", "entity_extraction", "manual_indexing"], 
    "Bibliographic Data": ["mod reference types", "pubmed types", "category", "pubmed publication status", "authors.name","language"],
    "Topics and Entities": ["topics", "confidence_levels", "source_methods", "source_evidence_assertions"],
    "Date Range": ["Date Modified in Pubmed", "Date Added To Pubmed", "Date Published", "Date Added to ABC"]
}

const DatePicker = ({facetName,currentValue,setValueFunction}) => {
    const dispatch = useDispatch();

    function formatDateRange(dateRange){
            let dateStart=dateRange[0].getFullYear()+"-"+parseInt(dateRange[0].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[0].getDate().toString().padStart(2,'0');
            let dateEnd=dateRange[1].getFullYear()+"-"+parseInt(dateRange[1].getMonth()+1).toString().padStart(2,'0')+"-"+dateRange[1].getDate().toString().padStart(2,'0');
            return [dateStart,dateEnd];
    }

    function formatToUTCString(dateRange){
        if (dateRange !== ''){
            let dateStart = new Date (dateRange[0]);
            let offset = dateStart.getTimezoneOffset();
            let parsedDateStart = new Date(Date.parse(dateRange[0])  + (offset * 60000));
            let parsedDateEnd = new Date(Date.parse(dateRange[1]) + (offset * 60000));
            return [parsedDateStart, parsedDateEnd];
        }else{
            return '';
        }
    }

    function handleFixedTimeClick(timeframe){
        var today = new Date();
        let newDate = ['',''];
        if(timeframe === 'Day'){
            newDate = formatDateRange([today,today]);
        }
        else if(timeframe === 'Week'){
            let lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastWeek,today]);
        }
        else if (timeframe === 'Month'){
            let lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastMonth,today]);
        }
        else if(timeframe === 'Year'){
            let lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
            newDate = formatDateRange([lastYear,today]);
        }
        dispatch(setValueFunction(newDate));
        dispatch(searchReferences());
    }

    function handleDateChange(newDateRangeArr){
        if (newDateRangeArr === null) {
            dispatch(setValueFunction(''));
            dispatch(setSearchResultsPage(1));
            dispatch(searchReferences());
        }
        else if(!isNaN(Date.parse(newDateRangeArr[0])) && !isNaN(Date.parse(newDateRangeArr[1]))){
            dispatch(setValueFunction(formatDateRange(newDateRangeArr)));
            dispatch(setSearchResultsPage(1));
            dispatch(searchReferences());
        }
    }

    return(
        <div key={facetName} style={{textAlign: "left", paddingLeft: "2em", paddingBottom: "0.5em"}}>
            <h5>{facetName}</h5>
            <ButtonGroup aria-label="DateSetter" size ="sm" style={{display: "block"}}>
                <Button variant="secondary" style={{'borderBottomLeftRadius' : 0}} onClick={() => {handleFixedTimeClick('Day')}}>Day</Button>
                <Button variant="secondary" onClick={() => {handleFixedTimeClick('Week')}}>Week</Button>
                <Button variant="secondary" onClick={() => {handleFixedTimeClick('Month')}}>Month</Button>
                <Button variant="secondary" style={{'borderBottomRightRadius' : 0}} onClick={() => {handleFixedTimeClick('Year')}}>Year</Button>
            </ButtonGroup>
            <DateRangePicker value={formatToUTCString(currentValue)} onChange= {(newDateRangeArr) => {handleDateChange(newDateRangeArr)}}/>
        </div>
    )
}
const DateFacet = ({facetsToInclude}) => {

  const datePubmedModified = useSelector(state => state.search.datePubmedModified);
  const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
  const datePublished = useSelector(state => state.search.datePublished);
  const dateCreated = useSelector(state => state.search.dateCreated);

  return (
        <div>
            <Container>
                <Row>
                    <Col>
                        <DatePicker facetName={facetsToInclude[2]} currentValue={datePublished} setValueFunction={setDatePublished}/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DatePicker facetName={facetsToInclude[0]} currentValue={datePubmedModified} setValueFunction={setDatePubmedModified}/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DatePicker facetName={facetsToInclude[1]} currentValue={datePubmedAdded} setValueFunction={setDatePubmedAdded}/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DatePicker facetName={facetsToInclude[3]} currentValue={dateCreated} setValueFunction={setDateCreated}/>
                    </Col>
                </Row>
            </Container>
        </div>
  )
}

const Facet = ({facetsToInclude, renameFacets}) => {

    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const dispatch = useDispatch();
    const negatedFacetCategories = ["pubmed publication status", "mod reference types", "category", "pubmed types", "confidence_levels"];
    const [openSubFacets, setOpenSubFacets] = useState(new Set());

    const [sourceMethodDescriptions, setSourceMethodDescriptions] = useState({});

    // fetch source method descriptions if 'source_methods' is included
    useEffect(() => {
        if (facetsToInclude.includes('source_methods')) {
            fetch(process.env.REACT_APP_RESTAPI + '/topic_entity_tag/source/all')
                .then(response => response.json())
                .then(data => {
                    const mapping = {};
                    data.forEach(item => {
                        mapping[item.source_method.toLowerCase()] = item.description;
                    });
                    setSourceMethodDescriptions(mapping);
                })
                .catch(err => console.error("Error fetching source method descriptions:", err));
        }
    }, [facetsToInclude]);
    
    const toggleSubFacet = (subFacetLabel) => {
        const newOpenSubFacets = new Set([...openSubFacets]);
        newOpenSubFacets.has(subFacetLabel) ?
            newOpenSubFacets.delete(subFacetLabel) :
            newOpenSubFacets.add(subFacetLabel);
        setOpenSubFacets(newOpenSubFacets);
    };

    const StandardFacetCheckbox = ({facet, value}) => {
        return(

                <Form.Check inline type="checkbox"
                    checked={searchFacetsValues.hasOwnProperty(facet) && searchFacetsValues[facet].includes(value)}
                    onChange={(evt) => {

                        if (evt.target.checked) {
                            dispatch(addFacetValue(facet, value));
                            if(facet === 'topics'  && !searchExcludedFacetsValues.confidence_levels  && !searchFacetsValues.confidence_levels) {
                                dispatch(addExcludedFacetValue('confidence_levels', 'NEG'));
                            }
                        } else {
                            dispatch(removeFacetValue(facet, value));
                        }
                }}/>
        )
    }

    const NegatedFacetCheckbox = ({facet, value}) => {
        const includedChecked= searchFacetsValues.hasOwnProperty(facet) && searchFacetsValues[facet].includes(value);
        const excludedChecked= searchExcludedFacetsValues.hasOwnProperty(facet) && searchExcludedFacetsValues[facet].includes(value);

        const handleClickInclude = () => {
            if (!includedChecked && excludedChecked) {
                dispatch(removeExcludedFacetValue(facet, value));
                dispatch(addFacetValue(facet, value));
            } else if(!includedChecked){
                dispatch(addFacetValue(facet, value));
            }
            else {
                dispatch(removeFacetValue(facet, value));
            }
        }
        const handleClickExclude = () => {
            if (!excludedChecked && includedChecked) {
                dispatch(removeFacetValue(facet, value));
                dispatch(addExcludedFacetValue(facet, value));
            } else if (!excludedChecked){
                dispatch(addExcludedFacetValue(facet, value));
            } else {
                dispatch(removeExcludedFacetValue(facet, value));
            }
        }

        return(
            <span>
                <FontAwesomeIcon icon={faCheckSquare} style= {includedChecked ? {color: "#28a745"} : {color: "#808080"}}
                    onClick={handleClickInclude}/>
                &nbsp;
                <FontAwesomeIcon icon={faMinusSquare} style= {excludedChecked ? {color: "#dc3545"} : {color: "#808080"}}
                     onClick={handleClickExclude}/>
            </span>
        )
    }

    return (
        <div className="facet-container">
            {facetsToInclude.map(facetToInclude => {
                let key = facetToInclude.replaceAll(' ', '_');
                if (!['topics', 'confidence_levels', 'source_methods', 'source_evidence_assertions', 
                     'file_workflow', 'manual_indexing', 'reference_classification', 'entity_extraction'].includes(key)) {
                    key = key + '.keyword';
                }
                
                if (!searchFacets[key]?.buckets?.length) return null;

                const displayName = renameFacets[key] || key.replace(/(\.keyword|_)/g, ' ');
                const isOpen = openSubFacets.has(facetToInclude);

                return (
                    <div key={facetToInclude} style={{ marginLeft: '15px', marginBottom: '5px' }}>
                        <Button
                            variant="light"
                            size="md"
                            onClick={() => toggleSubFacet(facetToInclude)}
                            style={{ 
                                textAlign: 'left',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '1rem' // slightly smaller than main categories
                            }}
                        >
                            {isOpen ? 
                                <IoIosArrowDropdownCircle style={{ marginRight: '8px', fontSize: '1.2rem' }} /> : 
                                <IoIosArrowDroprightCircle style={{ marginRight: '8px', fontSize: '1.2rem' }} />
                            }
                            {displayName}
                        </Button>
                        
                        <Collapse in={isOpen}>
                            <div style={{ marginLeft: '20px' }}>
                                {facetToInclude === 'authors.name' && <AuthorFilter />}
                                {searchFacets[key].buckets.map(bucket => (
                                    <Container key={bucket.key}>
                                        <Row className="align-items-center facet-item">
                                            <Col xs={3} sm={2}>
                                                {negatedFacetCategories.includes(facetToInclude) ? 
                                                    <NegatedFacetCheckbox facet={key} value={bucket.key} /> : 
                                                    <StandardFacetCheckbox facet={key} value={bucket.key} />
                                                }
                                            </Col>
                                            <Col xs={6} sm={7}>
                                                {key === 'source_methods' ? (
                                                    <OverlayTrigger
                                                        placement="right"
                                                        overlay={
                                                            <Tooltip id={`tooltip-${bucket.key}`}>                                                                    
                                                                {sourceMethodDescriptions[bucket.key] || 'No description available.'}                                 
                                                            </Tooltip>
                                                        }
                                                    >                                                                                                                 
                                                        <span dangerouslySetInnerHTML={{ __html: bucket.name || bucket.key }} />                                      
                                                    </OverlayTrigger>                                                                                                 
                                                ) : (                                                                                                                 
                                                    <span dangerouslySetInnerHTML={{ __html: bucket.name || bucket.key }} />
                                                )}                                                                                                                    
                                            </Col>                                                                                                                    
                                            <Col xs={3} sm={3}>                                                                                                       
                                                <Badge variant="secondary">                                                                                           
                                                    {['topics', 'confidence_levels', 'source_methods', 'source_evidence_assertions'].includes(key) &&
                                                        bucket.docs_count !== undefined ?
                                                        bucket.docs_count.doc_count.toLocaleString() :
                                                        bucket.doc_count.toLocaleString()}                                                                            
                                                </Badge>                                                                                                              
                                            </Col>                                                                                                                    
                                        </Row>                                                                                                                        
                                    </Container>
                                ))}                                                                                                                                   
                                <ShowMoreLessAllButtons facetLabel={key} facetValue={searchFacets[key]} />                                                            
                            </div>                                                                                                                                    
                        </Collapse>                                                                                                                                   
                    </div>
                );
            })}
        </div>
    );
};


const AuthorFilter = () => {
  const authorFilter = useSelector(state => state.search.authorFilter);
  const dispatch = useDispatch();

  return (
    <InputGroup size="sm" className="mb-3" style ={{width: "85%"}}>
    <Form.Control inline="true" type="text" id="authorFilter" name="authorFilter" placeholder="Filter Authors (case sensitive)" value={authorFilter}
                  onChange={(e) => dispatch(setAuthorFilter(e.target.value))}
                  onKeyPress={(event) => {
                      if (event.charCode === 13) {
                          dispatch(filterFacets())
                      }
                  }}
    />
    <Button inline="true" style={{width: "4em"}} size="sm"
      onClick={() => {
        dispatch(filterFacets())
      }}>Filter</Button>
      <Button variant="danger" size = "sm"
        onClick={() => {
          dispatch(setAuthorFilter(''));
          dispatch(filterFacets())
      }}>X</Button></InputGroup>
  )
}


const ShowMoreLessAllButtons = ({facetLabel, facetValue}) => {
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const dispatch = useDispatch();

    return (
        <div style={{paddingLeft: "1em"}}>
            {facetValue.buckets && facetValue.buckets.length >= searchFacetsLimits[facetLabel] ?
                <button className="button-to-link" onClick={()=> {
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] * 2;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    dispatch(filterFacets());
                }}>+Show More</button> : null
            }
            {searchFacetsLimits[facetLabel] > INITIAL_FACETS_LIMIT ?
                <span>&nbsp;&nbsp;&nbsp;&nbsp;<button className="button-to-link" onClick={() => {
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] = INITIAL_FACETS_LIMIT;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    dispatch(filterFacets());
                }}>-Show Less</button></span> : null
            }
            {facetValue.buckets && facetValue.buckets.length >= searchFacetsLimits[facetLabel] ? <span>&nbsp;&nbsp;&nbsp;&nbsp;
                <button className="button-to-link" onClick={() =>{
                    let newSearchFacetsLimits = _.cloneDeep(searchFacetsLimits);
                    newSearchFacetsLimits[facetLabel] = searchFacetsLimits[facetLabel] = 1000;
                    dispatch(setSearchFacetsLimits(newSearchFacetsLimits));
                    dispatch(filterFacets());
                }}>+Show All</button></span> : null }
            </div>
    )
}


const Facets = () => {

    const [openFacets, setOpenFacets] = useState(new Set());
    const searchResults = useSelector(state => state.search.searchResults);
    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const searchQuery = useSelector(state => state.search.searchQuery);
    const readyToFacetSearch = useSelector(state => state.search.readyToFacetSearch);
    const facetsLoading = useSelector(state => state.search.facetsLoading);
    const datePubmedModified = useSelector(state => state.search.datePubmedModified);
    const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
    const datePublished= useSelector(state => state.search.datePublished);
    const dateCreated = useSelector(state => state.search.dateCreated);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
    const modPreferencesLoaded = useSelector(state => state.search.modPreferencesLoaded);
    const applyToSingleTag = useSelector(state => state.search.applyToSingleTag);
    const seaValues = useSelector(state => state.search.searchFacetsValues['source_evidence_assertions'] || []);
    const hasGroupSEA = seaValues.some(v => v === 'ECO:0006155' || v === 'ECO:0007669');
    const dispatch = useDispatch();

    // Whenever a group-SEA is selected, turn off applyToSingleTag
    useEffect(() => {
      if (hasGroupSEA && applyToSingleTag) {
        dispatch(setApplyToSingleTag(false));
      }
    }, [hasGroupSEA, applyToSingleTag, dispatch]);

    const handleCheckboxChange = (event) => {
        dispatch(setApplyToSingleTag(event.target.checked));
    };
    
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
        if (Object.keys(searchFacets).length === 0 && searchResults.length === 0) {
            dispatch(fetchInitialFacets(searchFacetsLimits));
        } else {
            if (readyToFacetSearch === true && (searchQuery !== "" || searchResults.length > 0 || Object.keys(searchFacetsValues).length > 0 || Object.keys(searchExcludedFacetsValues).length > 0)) {
                dispatch(setSearchResultsPage(1));
                dispatch(setAuthorFilter(""));
                dispatch(searchReferences());
            }
        }
    }, [searchFacetsValues,searchExcludedFacetsValues, applyToSingleTag]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let newOpenFacets = new Set([...openFacets]);
        Object.keys(searchFacetsValues).forEach(facet =>
            Object.entries(FACETS_CATEGORIES_WITH_FACETS).forEach(([category, facetsInCategory]) => {
                if (facetsInCategory.includes(facet.replace('.keyword', '').replaceAll('_', ' '))) {
                    newOpenFacets.add(category);
                }
            })
        );
        if (datePubmedAdded || datePubmedModified || datePublished) {
            newOpenFacets.add('Date Range');
        }
        setOpenFacets(newOpenFacets);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=> {
        if(modPreferencesLoaded === 'false' && accessLevel !== 'No'){
            dispatch(setModPreferencesLoaded(true));
            if(searchFacetsValues["mods_in_corpus_or_needs_review.keyword"]){
                if(!searchFacetsValues["mods_in_corpus_or_needs_review.keyword"].includes(accessLevel)) {
                    dispatch(addFacetValue("mods_in_corpus_or_needs_review.keyword", accessLevel));
                }
            }
            else {
                dispatch(addFacetValue("mods_in_corpus_or_needs_review.keyword", accessLevel));
            }
            if(searchFacetsValues["language.keyword"]){
                if(!searchFacetsValues["language.keyword"].includes('English')) {
                    dispatch(addFacetValue("language.keyword", 'English'));
                }
            }
            else {
                dispatch(addFacetValue("language.keyword", 'English'));
            }
            dispatch(searchReferences());

        }
    }, [accessLevel]) // eslint-disable-line react-hooks/exhaustive-deps


    /*
    useEffect(() => {                                                    
	if (applyToSingleTag) {
	    const topics = searchFacetsValues['topics'] || [];
	    const confidenceLevels = searchFacetsValues['confidence_levels'] || [];
	    if (topics.length > 1 || confidenceLevels.length > 1) {
		setShowWarning(true);
		setTimeout(() => {
		    setShowWarning(false);
		}, 6000);
	    } else {
		setShowWarning(false);
	    }
	} else {
	    setShowWarning(false);
	}
    }, [applyToSingleTag, searchFacetsValues]);
    */

    return (
        <>
            <LoadingOverlay active={facetsLoading} />
            {
                Object.entries(FACETS_CATEGORIES_WITH_FACETS).map(([facetCategory, facetsInCategory]) =>
                    <div key={facetCategory} style={{textAlign: "left"}}>
                        <Button variant="light" size="lg" eventkey="0" onClick={() => toggleFacetGroup(facetCategory)}>
                            {openFacets.has(facetCategory) ? <IoIosArrowDropdownCircle/> : <IoIosArrowDroprightCircle/>} {facetCategory}
                        </Button>
			<Collapse in={openFacets.has(facetCategory)}>
                            <div>
				{facetCategory === 'Topics and Entities' && (
				   <>
				     {/*  {showWarning && (
					   <div className="alert alert-warning" role="alert">
					       You can only pick one topic and one confidence level since you checked the "apply selections to one tag" checkbox.
					   </div>
				       )} */}
                                       <Form.Check
					   type="checkbox"
					   label="apply selections to single tag"
					   checked={applyToSingleTag}
					   onChange={handleCheckboxChange}
					   disabled={hasGroupSEA}
					   style={{
					       display: 'inline-block',
					       marginLeft: '30px',
					       fontSize: '0.8rem',
					       opacity: hasGroupSEA ? 0.5 : 1
					   }}
                                       />
				   </>
                                )}
                                {facetCategory === 'Date Range' ? <DateFacet facetsToInclude={facetsInCategory}/> : <Facet facetsToInclude={facetsInCategory} renameFacets={RENAME_FACETS}/>}
                            </div>
                        </Collapse>
                    </div>
                )
            }
        </>
    )
}

export default Facets;
