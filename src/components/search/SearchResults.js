import React, {useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {Link} from 'react-router-dom';
import {
    setGetReferenceCurieFlag,
    setReferenceCurie
} from '../../actions/biblioActions';
import {Badge, Modal} from 'react-bootstrap';
import {setSearchError, searchXref} from '../../actions/searchActions';
import Button from 'react-bootstrap/Button';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFilePdf, faPenSquare, faImage, faPeopleArrows} from "@fortawesome/free-solid-svg-icons";
import { api } from "../../api";
import { useHistory } from "react-router-dom";
import { normalizeDisplayPrefs, xrefPrefix, journalInfoFromCitation } from './settings/searchDisplayPrefs';

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
  // Display profile (SCRUM-6512): section order/visibility, xref prefix
  // selection, icons and the author->person link. null (no profile loaded)
  // normalizes to the defaults, which render the card exactly as before.
  // Select the raw value and memoize the normalization: normalizing inside the
  // selector returns a fresh object per call, and useSelector's === comparison
  // would then re-render every card on any dispatch anywhere in the app.
  const rawDisplayPrefs = useSelector(state => state.search.searchDisplayPrefs);
  const displayPrefs = useMemo(() => normalizeDisplayPrefs(rawDisplayPrefs), [rawDisplayPrefs]);
  const dispatch = useDispatch();

  const FileDownloadIcon = ({curie}) => {
      const curiePDFIDsMap = useSelector(state => state.search.curiePDFIDsMap);

      const downloadPDFfile = (referencefileId) => {
          api.get('/reference/referencefile/download_file/' + referencefileId, {
              responseType: 'blob'
          }).then(response => {
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const pdfUrl = window.URL.createObjectURL(blob);
              window.open(pdfUrl, '_blank');
          })
      }

      return(
          curiePDFIDsMap[curie] ? <Button className = "file-download-button" onClick={() => downloadPDFfile(curiePDFIDsMap[curie])}><FontAwesomeIcon icon={faFilePdf} size= '3x'/></Button> : null
      )
  }

  const TETRedirect = ({ curie }) => {
    const history = useHistory(); // Correct usage of useHistory
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
    // Observers are read-only: don't advertise the TET editor (the biblio
    // router would coerce it to display anyway) (SCRUM-6431). The image
    // indicator stays: file management is an observer-permitted read view.
    const cognitoObserver = useSelector(state => state.isLogged.cognitoObserver);
    const goToTET = () => {
        history.push(`/Biblio/?action=entity&referenceCurie=${curie}`); // Use backticks for template literals
    };
    return (
         (isSignedIn && !cognitoObserver) ?  <Button  className="redirect-TET-button"  onClick={goToTET}  >
                          <FontAwesomeIcon icon={faPenSquare} id="TET_icon_id" size='2x'/>
                          <p id="TET_text_id">TET</p>
                      </Button>  : null
    );
  };

  const ImageIndicator = ({ curie, imageCount }) => {
    const history = useHistory();
    const goToFileManagement = () => {
        history.push(`/Biblio/?action=filemanagement&referenceCurie=${curie}`);
    };
    return (
        <Button className="image-indicator"
                title={`${imageCount} image${imageCount === 1 ? '' : 's'} uploaded - click to manage files`}
                onClick={goToFileManagement}>
            <FontAwesomeIcon icon={faImage} size='3x'/>
        </Button>
    );
  };

  const PersonRedirect = ({ curie }) => {
    const history = useHistory();
    // Gate like the TET button (SCRUM-6431): the biblio router only routes
    // signed-in non-observers to the person screen — observers are coerced to
    // the display view and signed-out users get NoAccessAlert, so advertising
    // the icon to them is misleading (review finding).
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
    const cognitoObserver = useSelector(state => state.isLogged.cognitoObserver);
    const goToPerson = () => {
        history.push(`/Biblio/?action=person&referenceCurie=${curie}`);
    };
    return (
        (isSignedIn && !cognitoObserver) ?
        <Button title="Open this paper's authors on the person screen"
                onClick={goToPerson}>
            <FontAwesomeIcon icon={faPeopleArrows} size='3x'/>
        </Button> : null
    );
  };

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

  // Show every cross-reference type by default, including dataset xrefs
  // (PDB, GEO, ...), so curators can see the xref that matched their search.
  // The display profile can hide individual prefixes (SCRUM-6512).
  const displayedXrefs = (reference.cross_references || []).filter(
    (xref) => !displayPrefs.hiddenXrefPrefixes.includes(xrefPrefix(xref.curie))
  );

  // The action icons live in a card-level rail beside the sections (not inside
  // any section): they used to be absolutely positioned in the xref row, which
  // overlapped the card text once sections could be hidden or reordered
  // (curator finding). Children ordered to match the old left-to-right cluster:
  // person, images, TET, PDF. The person icon (its own toggle, separate from
  // the other action icons) replaced the "Authors :" label link.
  const icons = (displayPrefs.showIcons || displayPrefs.showPersonIcon) ? (
    <>
      {displayPrefs.showPersonIcon && (
          <PersonRedirect curie={reference.curie}/>
      )}
      {displayPrefs.showIcons && (
          <>
              {reference.image_count > 0 && (
                  <ImageIndicator curie={reference.curie} imageCount={reference.image_count}/>
              )}
              <TETRedirect curie={reference.curie}/>
              <FileDownloadIcon curie = {reference.curie}/>
          </>
      )}
    </>
  ) : null;

  const showSection = (id) => !displayPrefs.hiddenSections.includes(id);

  // The card's customizable sections, rendered below the title in the
  // profile's order. Hiding a section that has no content is a no-op.
  const sectionRenderers = {
    xrefs: () => (
      showSection('xrefs') &&
      <Row key="xrefs"><Col><div className="searchRow-xref">
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
              {displayedXrefs.map((xref, i) => (
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
              ))}
          </ul>
      </div></Col></Row>
    ),
    authors: () => (
      // Author names are plain text, reserved for a future link to each
      // author's own person record; the route to the Biblio person screen is
      // the person icon in the card's action rail (SCRUM-6512).
      showSection('authors') &&
      <div key="authors" className="searchRow-other">Authors : {(reference.authors || []).map((author, i) => (
          <span key={i}>
              {i ? ' ' : ''}
              <span dangerouslySetInnerHTML={{__html: author.name}} />
          </span>
      ))}</div>
    ),
    pubDate: () => (
      showSection('pubDate') &&
      <div key="pubDate" className="searchRow-other">Publication Date: {reference.date_published}</div>
    ),
    journal: () => {
      // Journal info from the citation (curator request): lets corpus calls
      // that hinge on the journal (e.g. eLife's review model) happen from the
      // card without toggling to the biblio display.
      const journal = journalInfoFromCitation(reference.citation, reference.title);
      return (
        showSection('journal') && journal
          ? <div key="journal" className="searchRow-other">Journal: {journal}</div>
          : null
      );
    },
    abstract: () => (
      showSection('abstract') &&
      <div key="abstract" className="searchRow-other">
        Abstract:
        <div style={{ cursor: 'pointer' }} onClick={toggleAbstract}>
          <span dangerouslySetInnerHTML={{ __html: isExpanded ? formatAbstract(reference.abstract) : truncateAbstract(reference.abstract, 500) }} />
          <span style={{ color: 'blue', textDecoration: 'underline', marginLeft: '10px' }}>
            {isExpanded ? 'Show Less' : 'Show More'}
          </span>
        </div>
      </div>
    ),
    matchingText: () => (
      showSection('matchingText') && reference.highlight
        ? <MatchingTextBox key="matchingText" matches={reference.highlight}/>
        : null
    ),
  };

  // Genome-scale summary badges (SCRUM-6614). The indexer collapses TET
  // groups above the large-scale threshold into one summary tag per
  // (entity type, topic); the API surfaces them on the hit as
  // large_scale_tags with resolved ATP names. Rendered outside the
  // customizable sections: saved section orders predate this and it is a
  // data-completeness signal, not a layout choice.
  // One badge per (entity type, topic): the indexer mints one summary tag per
  // sub-group (also split by data_provider, SEA group and owning MOD), so a
  // paper whose alleles span two providers would otherwise show two allele
  // badges that read like a bug (review finding). Sum the counts for display.
  const largeScaleSummaries = (() => {
    const byKey = new Map();
    for (const tag of reference.large_scale_tags || []) {
      const key = `${tag.entity_type || ''}|${tag.topic || ''}`;
      const entry = byKey.get(key) || {
        name: tag.entity_type_name || tag.topic_name || tag.entity_type || 'association',
        count: 0,
        hasCount: false,
      };
      if (tag.entity_count != null) {
        entry.count += tag.entity_count;
        entry.hasCount = true;
      }
      byKey.set(key, entry);
    }
    return [...byKey.values()];
  })();

  // "gene" -> "genes", "protein complex" -> "protein complexes"; names that
  // are already plural ("species") pass through.
  const pluralizeEntityName = (name) =>
    name.endsWith('s') ? name : (/(sh|ch|x|z)$/.test(name) ? `${name}es` : `${name}s`);

  const largeScaleBadges = largeScaleSummaries.length > 0 && (
    <div className="searchRow-other">
      {largeScaleSummaries.map((summary, i) => {
        const count = summary.hasCount ? `${summary.count.toLocaleString()} ` : '';
        return (
          <Badge key={i} variant="info" style={{ marginRight: '6px' }}
                 title="This paper's associations of this type exceed the display threshold; the full list is in the database and on the Biblio page.">
            {`${count}${pluralizeEntityName(summary.name)} (large-scale data)`}
          </Badge>
        );
      })}
    </div>
  );

  return (
    <Row>
      <Col className="Col-general Col-display Col-search" >
        <div className="d-flex">
          <div className="search-card-body">
            <div className="searchRow-title"><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}} onClick={() => { dispatch(setReferenceCurie(reference.curie)); dispatch(setGetReferenceCurieFlag(true)); }}><span dangerouslySetInnerHTML={{__html: reference.title}} /></Link></div>
            {largeScaleBadges}
            {displayPrefs.sectionOrder.map((id) =>
              sectionRenderers[id] ? sectionRenderers[id]() : null
            )}
          </div>
          {icons && <div className="search-card-icons">{icons}</div>}
        </div>
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
        <div style={{ width: '95%', margin: '0 auto' }}>
            {
                searchResults.length > 0 && searchSuccess ?
                    <Container fluid style={{ padding: 0 }}>
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
                <Modal.Body>Couldn't search references : {searchError}</Modal.Body>
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
