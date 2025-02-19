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
    removeDateCreated
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
    const dispatch = useDispatch();

    const getDisplayName = (facet, value) => {
        const facetData = searchFacets[facet];
        if (!facetData?.buckets) return value;
        const bucket = facetData.buckets.find(b => b.key === value);
        return bucket?.name || value;
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

    return (
        <Container fluid>
            <Row>
                <Col style={{ textAlign: "left" }}>
                    {Object.entries(searchFacetsValues).map(([facet, values]) => (
                        Array.isArray(values) ? values.map(value => {
			    const displayValue = (getDisplayName(facet, value));
                            return (
				<BreadcrumbItem
                                    key={facet + value + "_breadcrumb"}
				    label={`${RENAME_FACETS[facet]?.label || facet.replace('.keyword', '').replace(/_/g, ' ')}: ${displayValue}`}
				    onRemove={() => handleRemoveFacet(facet, value)}
				/>
			    );
                        }) : (
                            <BreadcrumbItem
                                key={facet + "_breadcrumb"}
                                label={RENAME_FACETS[facet]?.label || facet.replace('.keyword', '').replace(/_/g, ' ')}
                                onRemove={() => handleRemoveDate(RENAME_FACETS[facet].action)}
                            />
                        )
                    ))}
                    {Object.entries(searchExcludedFacetsValues).map(([facet, values]) =>
                        values.map(value =>
                            <BreadcrumbItem
                                key={facet + value + "_breadcrumb"}
                                label={`Exclude ${(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet].label || RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value}`}
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
                </Col>
            </Row>
        </Container>
    );
};

export default BreadCrumbs;
