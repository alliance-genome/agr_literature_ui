import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Link} from 'react-router-dom';
import {setGetReferenceCurieFlag, setReferenceCurie} from '../../actions/biblioActions';
import {Modal} from 'react-bootstrap';
import {setSearchError, searchXref, setSearchResultsPage, searchReferences} from '../../actions/searchActions';
import Button from 'react-bootstrap/Button';
import Pagination from "react-bootstrap/Pagination";

const MatchingTextBox = (highlight) => {
  return (
    <div className="searchRow-other"> Matching Text:
      <table><tbody>
        {Object.keys(highlight.matches).map((match,index) => (
          <tr><td class="highlight-label">{match}</td><td class="highlight-value" dangerouslySetInnerHTML={{__html: highlight.matches[match]}} /></tr>
        ))}
      </tbody></table>
    </div>
  )
}

const XrefElement = (xref) => {
    const [url, setUrl] = useState(null);
    useEffect(() => {
      searchXref(xref.xref.curie, setUrl);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <li><span className="obsolete">{xref.xref.is_obsolete === 'false' ?  '' : 'obsolete '}</span><a href={url} rel="noreferrer noopener" target="_blank">{xref.xref.curie}</a></li>
    )
}

const SearchResults = () => {

    const searchResults = useSelector(state => state.search.searchResults);
    const searchSuccess = useSelector(state => state.search.searchSuccess);
    const searchError = useSelector(state => state.search.searchError);
    const dispatch = useDispatch();



    function truncateAbstract(abstract, maxLength){
      if (abstract.length <= maxLength) return abstract;
      return abstract.substr(0, abstract.lastIndexOf(' ', maxLength));
    }

    return (
        <div>
            {
                searchResults.length > 0 && searchSuccess ?
                <Container>
                    { searchResults.map((reference, index) => (
                        <Row key={`reference ${index}`}>
                            <Col className="Col-general Col-display Col-search" >
                              <div className="searchRow-title"><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}><span dangerouslySetInnerHTML={{__html: reference.title}} /></Link></div>
                              <div className="searchRow-xref">
                                <ul><li><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}>{reference.curie}</Link></li>
                                {reference.cross_references ? reference.cross_references.map((xref, i) => (
                                  <XrefElement key={`${xref} ${i}`} xref={xref}/>
                                )) : null}
                                </ul>
                              </div>
                              <div className="searchRow-other">Authors : <span dangerouslySetInnerHTML={{__html: reference.authors ? reference.authors.map((author, i) => ((i ? ' ' : '') + author.name)) : ''}} /></div>
                              <div className="searchRow-other">Publication Date: {reference.date_published}</div>
                               <div className="searchRow-other">Abstract: <p>{reference.abstract == null || reference.abstract.length<500 ? <span dangerouslySetInnerHTML={{__html:reference.abstract}} /> : <span dangerouslySetInnerHTML={{__html: truncateAbstract(reference.abstract,500)+'...'}}/>}</p></div>
                              {reference.highlight ? <MatchingTextBox matches={reference.highlight}/> : null}
                            </Col>
                        </Row>))
                    }
                </Container> : null
            }
            {
                 searchResults.length === 0 && searchSuccess ?
                    <div>
                        No Results found
                    </div> : null
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
