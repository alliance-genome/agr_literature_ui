import React, { useState, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {useDispatch, useSelector} from 'react-redux';
import {
    searchReferences,
    setSearchQuery,
    setSearchResultsPage,
    setAuthorFilter,
    setQueryFields
} from '../../actions/searchActions';

const SearchBar = () => {
    const searchLoading = useSelector(state => state.search.searchLoading);
    const searchQuery = useSelector(state => state.search.searchQuery);
    const fieldToSearch = useSelector(state => state.search.query_fields);

    const dispatch = useDispatch();

    const [showHelp, setShowHelp] = useState(false);
    const helpBtnRef = useRef(null);

    const toggleHelpPopup = () => {
        setShowHelp(!showHelp);
    };
    
    function updateSearchField(text){
      dispatch(setQueryFields(text));
    }

    return (
        <>
            <div style={{width: "100%", maxWidth: "40em", margin: "auto", padding: "0 10px", boxSizing: "border-box", position: "relative"}}>
                <InputGroup className="mb-2" style={{ flexWrap: "nowrap", alignItems: "stretch" }}>
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic" className="inputGroupLeft" style={{ height: "100%", borderRadius: "0.25rem 0 0 0.25rem" }}>
                            {fieldToSearch}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => updateSearchField('All')}>All text fields</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Citation')}>Citation</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Title')}>Title</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Abstract')}>Abstract</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Author')}>Author</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('ORCID')}>ORCID</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Keyword')}>PubMed Keyword</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Curie')}>Alliance Curie</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Xref')}>Cross Reference</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Form.Control inline="true" type="text" id="titleField" name="titleField" value={searchQuery}
                                  style={{ minWidth: "0", flex: "1" }}
                                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                                  onKeyPress={(event) => {
                                      if (event.charCode === 13) {
                                        dispatch(setSearchResultsPage(1));
                                        dispatch(setAuthorFilter(''));
                                        dispatch(searchReferences());
                                      }
                                  }}
                    />
                    <Button inline="true" style={{minWidth: "4em"}} className="inputGroupCenter"
                            onClick={() => {
                              dispatch(setSearchResultsPage(1));
                              dispatch(setAuthorFilter(''));
                              dispatch(searchReferences());
                            }}>
                        {searchLoading ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <>
                            <span>Search</span>
                          </>
                        )}
                    </Button>
                    <Button ref={helpBtnRef} variant="light" onClick={toggleHelpPopup} style={{ marginLeft: '5px', padding: '0', background: 'none', border: 'none', flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faQuestionCircle} style={{ width: '20px', height: '20px' }} />
                    </Button>
                    {showHelp && (
                        <div style={{
                            position: 'absolute',
                            top: helpBtnRef.current.offsetTop + helpBtnRef.current.offsetHeight + 5 + 'px',
                            right: '10px',
                            width: 'min(300px, calc(100vw - 40px))',
                            padding: '10px',
                            fontSize: '0.8rem',
                            backgroundColor: '#EBF5FB',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                            textAlign: 'left',
                            zIndex: 1000,
                        }}>
                            <p>The search feature is enabled with wildcard functionality. For instance, querying 'act' would return documents containing any words starting with 'act' (e.g., actin, activities). To find exact matches use double quotes to find exact string matches; for example if you want returns for fish but not fishing use "fish" in your search.</p>Additionally, it supports boolean logic searches using the "AND" and "OR" operators. For example, a search for 'actin AND binding' will only retrieve documents that include both "actin" and "binding". Conversely, a search for 'actin OR binding' will return documents containing either "actin", "binding", or both.
                        </div>
                    )}

                </InputGroup>
            </div>
        </>
    )
}

export default SearchBar;
