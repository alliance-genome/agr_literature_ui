import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Link} from 'react-router-dom';
import {
    setGetReferenceCurieFlag,
    setReferenceCurie
} from '../../actions/biblioActions';
import {Modal} from 'react-bootstrap';
import {setSearchError, searchXref} from '../../actions/searchActions';
import Button from 'react-bootstrap/Button';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFilePdf} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";


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

  const FileDownloadIcon = ({curie}) => {
      const [mainPDF, setMainPDF] = useState(false);
      const accessToken = useSelector(state => state.isLogged.accessToken);
      const oktaMod = useSelector(state => state.isLogged.oktaMod);
      const fetchReferenceFileList = async () => {
          const referencefiles = await axios.get(process.env.REACT_APP_RESTAPI + "/reference/referencefile/show_all/" + curie);
          referencefiles.data.forEach((reference) => {
              if (reference.file_class === 'main'){
                  reference.referencefile_mods.forEach((mod) => {
                      if(mod.mod_abbreviation === oktaMod){
                          setMainPDF(reference.referencefile_id);
                      }
                      else if(mod.created_by ==='load_pmc_metadata' && !mainPDF){
                          setMainPDF(reference.referencefile_id);
                      }
                  })
              }
          });
      }
      const downloadPDFfile = (referencefileId, accessToken) => {
          let url = process.env.REACT_APP_RESTAPI + '/reference/referencefile/download_file/' + referencefileId
          axios({
              url: url,
              method: "GET",
              headers: {
                  'Authorization': 'Bearer ' + accessToken,
                  'Content-Type': 'application/pdf'
              },
              responseType: 'blob'
          }).then(response => {
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const pdfUrl = window.URL.createObjectURL(blob);
              window.open(pdfUrl, '_blank');
          })
      }
      if(accessToken && !mainPDF){
          fetchReferenceFileList();
      }

      return(
          mainPDF ? <Button className = "file-download-button" onClick={() => downloadPDFfile(mainPDF,accessToken)}><FontAwesomeIcon icon={faFilePdf} size= '3x'/></Button> : null
      )
  }
    
  function toggleAbstract() {
    setIsExpanded(!isExpanded);
  }

  function truncateAbstract(abstract, maxLength) {
    if (abstract === null) {
        return abstract
    }
      // remove specific HTML tags
    const cleanedAbstract = abstract.replace(/<\/?(strong|p)>/g, '');

    if (cleanedAbstract.length <= maxLength) return cleanedAbstract;
    return cleanedAbstract.substr(0, cleanedAbstract.lastIndexOf(' ', maxLength)) + ' ...';
  }

  function formatAbstract(abstract) {
        if (abstract === null) {
            return abstract
        }
        // ff <strong> tags are present, replace <p> with <br> and remove </p>
        if (abstract.includes('<strong>')) {
            return abstract.replace(/<p>/g, '<br>').replace(/<\/p>/g, '');
        }
        return abstract;
  }

  const determineUrl = (xref) => {
      // always use the URL privided by mod - through DQM submission
      // that is stored in cross_reference.pages
      // check if 'pages' is an array and not empty, occasionally debezium records may out of sync with elasticsearch and some crossreference may in elasticsearch but not in debezium, so check first
      if (xref.curie in crossReferenceResults && crossReferenceResults[xref.curie] !== undefined && Array.isArray(crossReferenceResults[xref.curie].pages) && crossReferenceResults[xref.curie].pages.length > 0) {
	  // use the URL from the first item in the 'pages' array
	  return crossReferenceResults[xref.curie].pages[0].url;
      }
      // if 'pages' is not an array or is empty, fall back to the main URL
      if (xref.curie in crossReferenceResults && crossReferenceResults[xref.curie] !== undefined) {
          return crossReferenceResults[xref.curie].url;
      }
      // if search is out of sync with database, return empty string to prevent UI crashing, but this should not happen on prod or stage
      return '';
  };
    
  return (
    <Row>
      <Col className="Col-general Col-display Col-search" > 
        <div className="searchRow-title"><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}><span dangerouslySetInnerHTML={{__html: reference.title}} /></Link></div>
          <Row><Col><div className="searchRow-xref">
              <ul>
                  <li>
                      <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}}
                            onClick={() => {
                                dispatch(setReferenceCurie(reference.curie));
                                dispatch(setGetReferenceCurieFlag(true));
                            }}>
                          {reference.curie}
                      </Link>
                  </li>
                  {reference.cross_references ? (
                      reference.cross_references.map((xref, i) => (
                          <li key={i}>
			<span className="obsolete">
			    {xref.is_obsolete === 'false' ? '' : 'obsolete '}
			</span>
                              <a href={determineUrl(xref)} rel="noreferrer noopener" target="_blank">
                                  {xref.curie}
                              </a>
                              {xref.curie.startsWith('PMID:') && (
                                  <div>
                                      <a href={`https://europepmc.org/article/MED/${xref.curie.split(':')[1]}`}
                                         rel="noreferrer noopener" target="_blank">
                                          EuropePMC
                                      </a>
                                  </div>
                              )}
                          </li>
                      ))
                  ) : null}
              </ul>
            <FileDownloadIcon curie = {reference.curie}/>
          </div></Col></Row>
          <div className="searchRow-other">Authors : <span dangerouslySetInnerHTML={{__html: reference.authors ? reference.authors.map((author, i) => ((i ? ' ' : '') + author.name)) : ''}} /></div>
        <div className="searchRow-other">Publication Date: {reference.date_published}</div>
        <div className="searchRow-other">
          Abstract:
          <div style={{ cursor: 'pointer' }} onClick={toggleAbstract}>
            <span dangerouslySetInnerHTML={{ __html: isExpanded ? formatAbstract(reference.abstract) : truncateAbstract(reference.abstract, 500) }} />
            <span style={{ color: 'blue', textDecoration: 'underline', marginLeft: '10px' }}>
              {isExpanded ? 'Show Less' : 'Show More'}
            </span>
          </div>
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
