import React, {useState} from 'react';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import {useDispatch, useSelector} from "react-redux";


const BreadCrumbs = () => {

    const searchFacetsValues = useSelector(state => state.query.searchFacetsValues);
    const dispatch = useDispatch();

    return (
        <Container fluid>
            <Row>
                <Col style={{textAlign: "left"}}>
                    {
                        Object.values(searchFacetsValues).forEach(values => values.forEach(values => alert(values)))
                    }
                </Col>
            </Row>
        </Container>
    )
}

export default BreadCrumbs;