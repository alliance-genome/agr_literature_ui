import React from 'react';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useDispatch, useSelector } from "react-redux";
import Button from "react-bootstrap/Button";
import { RiCloseFill } from "react-icons/ri";
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

const BreadCrumbs = () => {
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchExcludedFacetsValues = useSelector(state => state.search.searchExcludedFacetsValues);
    const datePubmedAdded = useSelector(state => state.search.datePubmedAdded);
    const datePubmedModified = useSelector(state => state.search.datePubmedModified);
    const datePublished = useSelector(state => state.search.datePublished);
    const dateCreated = useSelector(state => state.search.dateCreated);
    const dispatch = useDispatch();

    const handleRemoveDate = (dateType) => {
        switch (dateType) {
            case 'datePubmedAdded':
                dispatch(removeDatePubmedAdded());
                break;
            case 'datePubmedModified':
                dispatch(removeDatePubmedModified());
                break;
            case 'datePublished':
                dispatch(removeDatePublished());
                break;
            case 'dateCreated':
                dispatch(removeDateCreated());
                break;
            default:
                break;
        }
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
                            <span key={facet + value + "_breadcrumb"}>
                                <Button variant="outline-secondary">
                                    {(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value} &nbsp;
                                    <RiCloseFill onClick={() => handleRemoveFacet(facet, value)} />
                                </Button>&nbsp;&nbsp;
                            </span>
                        )) : (
                            <span key={facet + "_breadcrumb"}>
                                <Button variant="outline-secondary">
                                    {`${facet.replace('datePubmedAdded', 'Date Added to PubMed')
                                        .replace('datePubmedModified', 'Date Modified in PubMed')
                                        .replace('datePublished', 'Date Published')
                                        .replace('dateCreated', 'Date Created')}`} &nbsp;
                                    <RiCloseFill onClick={() => handleRemoveDate(facet)} />
                                </Button>&nbsp;&nbsp;
                            </span>
                        )
                    ))}
                    {Object.entries(searchExcludedFacetsValues).map(([facet, values]) =>
                        values.map(value =>
                            <span key={facet + value + "_breadcrumb"}>
                                <Button variant="outline-danger">Exclude&nbsp;{(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value} &nbsp;
                                    <RiCloseFill onClick={() => dispatch(removeExcludedFacetValue(facet, value))} />
                                </Button>&nbsp;&nbsp;
                            </span>
                        )
                    )}
                    {datePubmedAdded && (
                        <span key="datePubmedAdded_breadcrumb">
                            <Button variant="outline-secondary">
                                Date Added to PubMed &nbsp;
                                <RiCloseFill onClick={() => handleRemoveDate('datePubmedAdded')} />
                            </Button>&nbsp;&nbsp;
                        </span>
                    )}
                    {datePubmedModified && (
                        <span key="datePubmedModified_breadcrumb">
                            <Button variant="outline-secondary">
                                Date Modified in PubMed &nbsp;
                                <RiCloseFill onClick={() => handleRemoveDate('datePubmedModified')} />
                            </Button>&nbsp;&nbsp;
                        </span>
                    )}
                    {datePublished && (
                        <span key="datePublished_breadcrumb">
                            <Button variant="outline-secondary">
                                Date Published &nbsp;
                                <RiCloseFill onClick={() => handleRemoveDate('datePublished')} />
                            </Button>&nbsp;&nbsp;
                        </span>
                    )}
                    {dateCreated && (
                        <span key="dateCreated_breadcrumb">
                            <Button variant="outline-secondary">
                                Date Created &nbsp;
                                <RiCloseFill onClick={() => handleRemoveDate('dateCreated')} />
                            </Button>&nbsp;&nbsp;
                        </span>
                    )}
                    {(Object.keys(searchFacetsValues).length > 0 || Object.keys(searchExcludedFacetsValues).length > 0 || datePubmedAdded || datePubmedModified || datePublished || dateCreated) &&
                        <Button onClick={() => { dispatch(resetFacetValues()); dispatch(searchReferences()); }}>Clear All</Button>}
                </Col>
            </Row>
        </Container>
    );
};

export default BreadCrumbs;
