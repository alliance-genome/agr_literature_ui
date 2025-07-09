import React from 'react';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useDispatch, useSelector } from "react-redux";
import Button from "react-bootstrap/Button";
import {
    removeFacetValue,
    resetFacetValues,
    removeExcludedFacetValue,
    searchReferences,
    removeDatePubmedAdded,
    removeDatePubmedModified,
    removeDatePublished,
    removeDateCreated,
    downloadSearchReferences
} from "../../actions/searchActions";
import { RENAME_FACETS } from "./Facets";
import BreadcrumbItem from "./BreadCrumbItem";

const BreadCrumbs = () => {
    const searchFacets = useSelector(state => state.search.searchFacets);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
    const datePubmedModified = useSelector(state => state.search.datePubmedModified);
    const datePublished = useSelector(state => state.search.datePublished);
    const dateCreated = useSelector(state => state.search.dateCreated);
    const searchResultsCount = useSelector(state => state.search.searchResultsCount);
    const dispatch = useDispatch();

    const getDisplayName = (facet, value) => {
        const facetData = searchFacets[facet];
        if (!facetData?.buckets) return value;
        const bucket = facetData.buckets.find(b => b.key === value);
        return bucket?.name || value;
    };

    const isExceptionFacet = (facet) => {
	// Match either:
	// 1. language.keyword (Bibliographic Data's language)
	// 2. Any Alliance Metadata facets
       return facet === 'language.keyword' || facet.startsWith('mods_');
    };
    
    const getFacetLabel = (facet, value) => {
        const displayValue = getDisplayName(facet, value);
        const categoryName = RENAME_FACETS[facet]?.label || 
                            facet.replace('.keyword', '')
                                 .replaceAll('_', ' ');
        
        return isExceptionFacet(facet) ? `${categoryName}: ${displayValue}` : displayValue;
    };

    const getExcludedFacetLabel = (facet, value) => {
        const displayValue = getDisplayName(facet, value);
        const categoryName = RENAME_FACETS[facet]?.label || 
                            facet.replace('.keyword', '')
                                 .replaceAll('_', ' ');
        
        return isExceptionFacet(facet) ? 
            `Exclude ${categoryName}: ${displayValue}` : 
            `Exclude ${displayValue}`;
    };

    const handleRemoveDate = (action) => {
        dispatch(action());
        dispatch(searchReferences());
    };

    const handleRemoveFacet = (facet, value) => {
        dispatch(removeFacetValue(facet, value));
        dispatch(searchReferences());
    };

    const handleClearAll = () => {
        dispatch(resetFacetValues());
        Object.keys(RENAME_FACETS).forEach(key => {
            if (RENAME_FACETS[key].action) {
                dispatch(RENAME_FACETS[key].action());
            }
        });
        dispatch(searchReferences());
    };

    const dateKeys = ["datePubmedAdded", "datePubmedModified", "datePublished", "dateCreated"];
    const dateValues = { datePubmedAdded, datePubmedModified, datePublished, dateCreated };

    const downloadButtonLabel = (searchResultsCount > 1000) ? 'Download 1000 Results' : 'Download';

    function mapHitsToLines(data) {
      if (!data || !data.hits) return [];
      return data.hits.map(hit => {
        const curie = hit.curie || '';
        const citation = hit.citation || '';
        const crossReferences = (hit.cross_references || [])
          .map(ref => ref.curie)
          .join(',');
        return `${curie}\t${crossReferences}\t${citation}`;
      });
    }

    const handleSearchDownload = async () => {
      try {
        // console.log('handleSearchDownload');
        const resultPromise = dispatch(downloadSearchReferences()); // thunk returns a promise
        console.log('Waiting for search download...');
        const data = await resultPromise;
        // console.log('Downloaded data:', data);
        const tsvRows = mapHitsToLines(data);
        // console.log(tsvRows.join('\n'));
        const tsvHeaders = 'IDs\tcross references ids\tlong citation';
        const tsvContent = `data:text/tab-separated-values;charset=utf-8,${tsvHeaders}\n${tsvRows.join('\n')}`;
        const encodedUri = encodeURI(tsvContent);
        const fileName = 'abc_search_results_download.tsv';

        // trigger file download
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading search references:', error);
      }
    };

    return (
        <Container fluid>
            <Row>
                <Col style={{ textAlign: "left" }}>
                    <div className="d-flex justify-content-between" style={{ paddingBottom: '10px' }}>
                      <div>
                        {Object.entries(searchFacetsValues).map(([facet, values]) => (
                            Array.isArray(values) ? values.map(value => {
                                return (
                                    <BreadcrumbItem
                                            key={facet + value + "_breadcrumb"}
                                        label={getFacetLabel(facet, value)}
                                        onRemove={() => handleRemoveFacet(facet, value)}
                                    />
                                );
                            }) : (
                                <BreadcrumbItem
                                    key={facet + "_breadcrumb"}
                                    label={(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet].label || RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' '))}
                                    onRemove={() => handleRemoveDate(RENAME_FACETS[facet].action)}
                                />
                            )
                        ))}
                        {Object.entries(searchExcludedFacetsValues).map(([facet, values]) =>
                            values.map(value =>
                                <BreadcrumbItem
                                    key={facet + value + "_breadcrumb"}
                                    label={getExcludedFacetLabel(facet, value)}
                                    onRemove={() => dispatch(removeExcludedFacetValue(facet, value))}
                                />
                            )
                        )}
                        {dateKeys.map(key => {
                            const dateFacet = RENAME_FACETS[key];
                            const dateValue = dateValues[key];
                            return dateValue && (
                                <BreadcrumbItem
                                    key={`${key}_breadcrumb`}
                                    label={dateFacet.label}
                                    onRemove={() => handleRemoveDate(dateFacet.action)}
                                />
                            );
                        })}
                        {(Object.keys(searchFacetsValues).length > 0 || Object.keys(searchExcludedFacetsValues).length > 0 || dateKeys.some(key => dateValues[key])) &&
                            <Button onClick={handleClearAll}>Clear All</Button>}
                      </div>
                      <div>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleSearchDownload()}
                        >{downloadButtonLabel}</Button>
                      </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default BreadCrumbs;
