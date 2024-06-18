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
    removeDatePubmedAdded,
    removeDatePubmedModified,
    removeDatePublished,
    removeDateCreated,
    searchReferences
} from "../../actions/searchActions";
import { RENAME_FACETS } from "./Facets";
import BreadcrumbItem from "./BreadCrumbItem";

const BreadCrumbs = () => {
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
    const datePubmedModified = useSelector(state => state.search.datePubmedModified);
    const datePublished = useSelector(state => state.search.datePublished);
    const dateCreated = useSelector(state => state.search.dateCreated);
    const dispatch = useDispatch();

    const dateTypes = [
        { key: 'datePubmedAdded', label: 'Date Range: Added to PubMed', value: datePubmedAdded, action: removeDatePubmedAdded },
        { key: 'datePubmedModified', label: 'Date Range: Modified in PubMed', value: datePubmedModified, action: removeDatePubmedModified },
        { key: 'datePublished', label: 'Date Range: Published', value: datePublished, action: removeDatePublished },
        { key: 'dateCreated', label: 'Date Range: Added to ABC', value: dateCreated, action: removeDateCreated },
    ];

    const handleRemoveDate = (action) => {
        dispatch(action());
        dispatch(searchReferences());
    };

    const handleRemoveFacet = (facet, value) => {
        dispatch(removeFacetValue(facet, value));
        dispatch(searchReferences());
    };

    return (
        <Container fluid>
            <Row>
                <Col style={{ textAlign: "left" }}>
                    {Object.entries(searchFacetsValues).map(([facet, values]) => (
                        Array.isArray(values) ? values.map(value => (
                            <BreadcrumbItem
                                key={facet + value + "_breadcrumb"}
                                label={(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value}
                                onRemove={() => handleRemoveFacet(facet, value)}
                            />
                        )) : (
                            <BreadcrumbItem
                                key={facet + "_breadcrumb"}
                                label={`${facet.replace('datePubmedAdded', 'Date Added to PubMed')
                                    .replace('datePubmedModified', 'Date Modified in PubMed')
                                    .replace('datePublished', 'Date Published')
                                    .replace('dateCreated', 'Date Created')}`}
                                onRemove={() => handleRemoveDate(facet)}
                            />
                        )
                    ))}
                    {Object.entries(searchExcludedFacetsValues).map(([facet, values]) =>
                        values.map(value =>
                            <BreadcrumbItem
                                key={facet + value + "_breadcrumb"}
                                label={`Exclude ${(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value}`}
                                onRemove={() => dispatch(removeExcludedFacetValue(facet, value))}
                            />
                        )
                    )}
                    {dateTypes.map(({ key, label, value, action }) => (
                        value && (
                            <BreadcrumbItem
                                key={`${key}_breadcrumb`}
                                label={label}
                                onRemove={() => handleRemoveDate(action)}
                            />
                        )
                    ))}
                    {(Object.keys(searchFacetsValues).length > 0 || Object.keys(searchExcludedFacetsValues).length > 0 || dateTypes.some(({ value }) => value)) &&
                        <Button onClick={() => { dispatch(resetFacetValues()); dispatch(searchReferences()); }}>Clear All</Button>}
                </Col>
            </Row>
        </Container>
    );
};

export default BreadCrumbs;
