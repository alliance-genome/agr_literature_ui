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
    setApplyToSingleTag
} from '../../actions/searchActions';
import Form from 'react-bootstrap/Form';
import {Badge, Button, Collapse, ButtonGroup} from 'react-bootstrap';
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
}

export const FACETS_CATEGORIES_WITH_FACETS = {
    "Alliance Metadata": ["mods in corpus", "mods needs review", "mods in corpus or needs review"],
    "Bibliographic Data": ["mod reference types", "pubmed types", "category", "pubmed publication status", "authors.name"],
    "Topics and Entities": ["topics", "confidence_levels"],
    "Date Range": ["Date Modified in Pubmed", "Date Added To Pubmed", "Date Published","Date Added to ABC"]

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
            let parsedDateStart = Date.parse(dateRange[0])  + (offset * 60000);
            let parsedDateEnd = Date.parse(dateRange[1]) + (offset * 60000);
            return [parsedDateStart,parsedDateEnd];
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
        <div key={facetName} style={{textAlign: "left", paddingLeft: "2em"}}>
            <h5>{facetName}</h5>
            <Container fluid>
                <Row><Col sm={8}>
                <ButtonGroup aria-label="DateSetter" size ="sm">
                    <Button variant="secondary" onClick={() => {handleFixedTimeClick('Day')}}>Day</Button>
                    <Button variant="secondary" onClick={() => {handleFixedTimeClick('Week')}}>Week</Button>
                    <Button variant="secondary" onClick={() => {handleFixedTimeClick('Month')}}>Month</Button>
                    <Button variant="secondary" onClick={() => {handleFixedTimeClick('Year')}}>Year</Button>
                </ButtonGroup>
                </Col></Row>
                <DateRangePicker value={formatToUTCString(currentValue)} onChange= {(newDateRangeArr) => {handleDateChange(newDateRangeArr)}}/>
            </Container>

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
        <DatePicker facetName={facetsToInclude[2]} currentValue={datePublished} setValueFunction={setDatePublished}/>
        <DatePicker facetName={facetsToInclude[0]} currentValue={datePubmedModified} setValueFunction={setDatePubmedModified}/>
        <DatePicker facetName={facetsToInclude[1]} currentValue={datePubmedAdded} setValueFunction={setDatePubmedAdded}/>
        <DatePicker facetName={facetsToInclude[3]} currentValue={dateCreated} setValueFunction={setDateCreated}/>
    </div>
  )
}

const Facet = ({facetsToInclude, renameFacets}) => {

    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const dispatch = useDispatch();
    const negatedFacetCategories = ["pubmed publication status","mod reference types", "category", "pubmed types"];

    const StandardFacetCheckbox = ({facet, value}) => {
        return(

                <Form.Check inline type="checkbox"
                    checked={searchFacetsValues.hasOwnProperty(facet) && searchFacetsValues[facet].includes(value)}
                    onChange={(evt) => {
                        if (evt.target.checked) {
                            dispatch(addFacetValue(facet, value));
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
                &ensp;
                <FontAwesomeIcon icon={faMinusSquare} style= {excludedChecked ? {color: "#dc3545"} : {color: "#808080"}}
                     onClick={handleClickExclude}/>
            </span>
        )
    }

    return (
        <div>
            {Object.entries(searchFacets).length > 0 && facetsToInclude.map(facetToInclude => {
		    let key = facetToInclude.replaceAll(' ', '_');
                    if (key !== 'topics' && key !== 'confidence_levels'){
                        key = key + '.keyword';
                    }
                    if (key in searchFacets) {
                        let value = searchFacets[key];
                        return (
                            <div key={facetToInclude} style={{textAlign: "left", paddingLeft: "2em"}}>
                                <div>
                                    <h5>{renameFacets.hasOwnProperty(key) ? renameFacets[key] : key.replace('.keyword', '').replaceAll('_', ' ')}</h5>
                                    {facetToInclude === 'authors.name' ? <AuthorFilter/> : ''}
                                    {value.buckets && value.buckets.map(bucket =>
                                        <Container key={bucket.key}>
                                            <Row>
                                                <Col sm={2}>
                                                    {negatedFacetCategories.includes(facetToInclude) ? <NegatedFacetCheckbox facet = {key} value ={bucket.key}/> : <StandardFacetCheckbox facet = {key} value ={bucket.key}/>}
                                                </Col>
                                                <Col sm={7}>
                                                    <span dangerouslySetInnerHTML={{__html: bucket.name ? bucket.name : bucket.key}} />
                                                </Col>
                                                <Col>
                                                <Badge variant="secondary">
                                                    {['topics', 'confidence_levels'].includes(key) ? bucket.docs_count.doc_count : bucket.doc_count}
                                                </Badge>
                                                </Col>
                                            </Row>
                                        </Container>)}

				    
                                    <ShowMoreLessAllButtons facetLabel={key} facetValue={value} />
                                    <br/>
                                </div>
                            </div>
                        )
                    } else {
                        return null
                    }
                }
            )}
        </div>
    )
}

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
    const facetsLoading = useSelector(state => state.search.facetsLoading);
    const datePubmedModified = useSelector(state => state.search.datePubmedModified);
    const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
    const datePublished= useSelector(state => state.search.datePublished);
    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const modPreferencesLoaded = useSelector(state => state.search.modPreferencesLoaded);
    const applyToSingleTag = useSelector(state => state.search.applyToSingleTag);
    // const [showWarning, setShowWarning] = useState(false);
    const dispatch = useDispatch();

    const handleCheckboxChange = (event) => {
        dispatch(setApplyToSingleTag(event.target.checked));
        refreshData();
    };

    const refreshData = () => {
        dispatch(searchReferences());
    };

    // to trigger refresh when applyToSingleTag changes
    useEffect(() => {
        refreshData();
    }, [applyToSingleTag, dispatch])
    
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
            if (searchQuery !== "" || searchResults.length > 0 || Object.keys(searchFacetsValues).length > 0 || Object.keys(searchExcludedFacetsValues).length > 0) {
                dispatch(setSearchResultsPage(1));
                dispatch(setAuthorFilter(""));
                dispatch(searchReferences());
            }
        }
    }, [searchFacetsValues,searchExcludedFacetsValues]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if(modPreferencesLoaded === 'false' && oktaMod !== 'No'){
            dispatch(setModPreferencesLoaded(true));
            if(searchFacetsValues["mods_in_corpus_or_needs_review.keyword"]){
                if(!searchFacetsValues["mods_in_corpus_or_needs_review.keyword"].includes(oktaMod)) {
                    dispatch(addFacetValue("mods_in_corpus_or_needs_review.keyword", oktaMod));
                }
            }
            else{
                dispatch(addFacetValue("mods_in_corpus_or_needs_review.keyword", oktaMod));
            }
            dispatch(searchReferences());

        }
    }, [oktaMod]) // eslint-disable-line react-hooks/exhaustive-deps


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
					   style={{ display: 'inline-block', marginLeft: '30px', fontSize: '0.8rem' }}
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
