import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Link} from 'react-router-dom';
import {setGetReferenceCurieFlag, setReferenceCurie} from '../../actions/biblioActions';
import {Modal, Spinner} from 'react-bootstrap';
import {setSearchError} from '../../actions/queryActions';
import Button from 'react-bootstrap/Button';


const SearchResults = () => {

    const searchResults = useSelector(state => state.query.searchResults);
    const searchSuccess = useSelector(state => state.query.searchSuccess);
    const searchError = useSelector(state => state.query.searchError);

    const dispatch = useDispatch();

    return (
        <div>
            {
                searchResults.length > 0 && searchSuccess ?
                <Container>
                    <Row>
                        <Col lg={3} className="Col-general Col-display Col-display-left" >Curie</Col>
                        <Col lg={9} className="Col-general Col-display Col-display-right" >Title</Col>
                    </Row>
                    { searchResults.map((reference, index) => (
                        <Row key={`reference ${index}`}>
                            <Col lg={3} className="Col-general Col-display Col-display-left" ><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}>{reference.curie}</Link></Col>
                            <Col lg={9} className="Col-general Col-display Col-display-right" ><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}><span dangerouslySetInnerHTML={{__html: reference.title}} /></Link></Col>
                        </Row>))
                    }
                </Container> : null
            }
            <Modal show={searchError} onHide={() => dispatch(setSearchError(false))}>
                <Modal.Header closeButton>
                    <Modal.Title>Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>Couldn't search references</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => dispatch(setSearchError(false))}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default SearchResults;