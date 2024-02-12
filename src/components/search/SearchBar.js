import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {searchReferences, setSearchQuery, setSearchResultsPage, setAuthorFilter,setQueryFields,setPartialMatch} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';


const SearchBar = () => {

    const searchLoading = useSelector(state => state.search.searchLoading);
    const searchQuery = useSelector(state => state.search.searchQuery);
    const partialMatch = useSelector(state => state.search.partialMatch);
    const fieldToSearch = useSelector(state => state.search.query_fields);

    const dispatch = useDispatch();

    function updateSearchField(text){
      dispatch(setQueryFields(text));
    }

    return (
        <>
            <div style={{width: "40em", margin: "auto"}}>
                <InputGroup className="mb-2">
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic" className="inputGroupLeft">
                            {fieldToSearch}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => updateSearchField('All')}>All text fields</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Citation')}>Citation</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Title')}>Title</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Abstract')}>Abstract</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Keyword')}>PubMed Keyword</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Curie')}>Alliance Curie</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Xref')}>Cross Reference</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Form.Control inline="true" type="text" id="titleField" name="titleField" value={searchQuery}
                                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                                  onKeyPress={(event) => {
                                      if (event.charCode === 13) {
                                        dispatch(setSearchResultsPage(1));
                                        dispatch(setAuthorFilter(''));
                                        dispatch(searchReferences());
                                      }
                                  }}
                    />
                    <Button inline="true" style={{width: "5em"}} className = "inputGroupCenter"
                            onClick={() => {
                              dispatch(setSearchResultsPage(1));
                              dispatch(setAuthorFilter(''));
                              dispatch(searchReferences());
                            }}>
                        {searchLoading ? <Spinner animation="border" size="sm"/> : <span>Search</span>  }
                    </Button>
                </InputGroup>
            </div>
        </>
    )
}

export default SearchBar;
