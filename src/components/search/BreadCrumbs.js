import React from 'react';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {useDispatch, useSelector} from "react-redux";
import Button from "react-bootstrap/Button";
import {RiCloseFill} from "react-icons/ri";
import {removeFacetValue} from "../../actions/searchActions";
import {RENAME_FACETS} from "./Facets";


const BreadCrumbs = () => {

    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const dispatch = useDispatch();

    return (
        <Container fluid>
            <Row>
                <Col style={{textAlign: "left"}}>
                    {Object.entries(searchFacetsValues).map(([facet, values]) =>
                        <span key={facet + "_group"}>
                            {values.map(value =>
                                <span key={value + "_breadcrumb"}>
                                    <Button variant="outline-secondary">{(RENAME_FACETS.hasOwnProperty(facet) ? RENAME_FACETS[facet] : facet.replace('.keyword', '').replaceAll('_', ' ')) + ": " + value} &nbsp;
                                        <RiCloseFill onClick={() => dispatch(removeFacetValue(facet, value))}/>
                                    </Button>&nbsp;&nbsp;
                                </span>)}
                        </span>
                    )}
                </Col>
            </Row>
        </Container>
    )
}

export default BreadCrumbs;
