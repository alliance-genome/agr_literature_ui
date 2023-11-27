import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Link} from 'react-router-dom';
import {setGetReferenceCurieFlag, setReferenceCurie} from '../../actions/biblioActions';
import {Modal} from 'react-bootstrap';
import {setSearchError, searchXref} from '../../actions/searchActions';
import Button from 'react-bootstrap/Button';


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

const SearchResultItem = ({ reference }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const crossReferenceResults = useSelector(state => state.search.crossReferenceResults);
  const dispatch = useDispatch();
    
  function toggleAbstract() {
    setIsExpanded(!isExpanded);
  }

  function truncateAbstract(abstract, maxLength) {
    // remove specific HTML tags
    const cleanedAbstract = abstract.replace(/<\/?(strong|p)>/g, '');

    if (cleanedAbstract.length <= maxLength) return abstract;
    return cleanedAbstract.substr(0, cleanedAbstract.lastIndexOf(' ', maxLength)) + '...';
  }

  return (
    <Row>
      <Col className="Col-general Col-display Col-search" > 
        <div className="searchRow-title"><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}><span dangerouslySetInnerHTML={{__html: reference.title}} /></Link></div>
        <div className="searchRow-xref">
          <ul><li><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}>{reference.curie}</Link></li>
          {reference.cross_references ? reference.cross_references.map((xref, i) => (
            <li><span className="obsolete">{xref.is_obsolete === 'false' ?  '' : 'obsolete '}</span><a href={crossReferenceResults[xref.curie].url} rel="noreferrer noopener" target="_blank">{xref.curie}</a></li>
          )) : null}
          </ul>
        </div>
        <div className="searchRow-other">Authors : <span dangerouslySetInnerHTML={{__html: reference.authors ? reference.authors.map((author, i) => ((i ? ' ' : '') + author.name)) : ''}} /></div>
        <div className="searchRow-other">Publication Date: {reference.date_published}</div>	
        <div className="searchRow-other">
          Abstract: 
          <p onClick={toggleAbstract} style={{cursor: 'pointer', marginBottom: 0}}>
            {isExpanded || !reference.abstract || reference.abstract.length < 500
              ? <span dangerouslySetInnerHTML={{ __html: reference.abstract }} />
              : <span dangerouslySetInnerHTML={{ __html: truncateAbstract(reference.abstract, 500) }} />
            }
            <span style={{color: 'blue', textDecoration: 'underline', marginLeft: '10px'}} onClick={toggleAbstract}>
		{isExpanded ? 'Show Less' : 'Show More'}
            </span>
	  </p>
        </div>
        {reference.highlight ? <MatchingTextBox matches={reference.highlight}/> : null}                                       
      </Col>                                                                                                                  
    </Row>
  );
};


const SearchResults = () => {

    const searchResults = useSelector(state => state.search.searchResults);
    const searchSuccess = useSelector(state => state.search.searchSuccess);
    const searchError = useSelector(state => state.search.searchError);
    const dispatch = useDispatch();
  
    return (
        <div>
            {
                searchResults.length > 0 && searchSuccess ?
		<Container>
		    {searchResults.map((reference, index) => (
			<SearchResultItem key={`reference-${index}`} reference={reference} />
		    ))}
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
