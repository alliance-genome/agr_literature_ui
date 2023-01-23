import React, {useState} from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {searchReferences, setSearchQuery, setSearchResultsPage, setAuthorFilter,setQueryFields} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';


const SearchBar = () => {

    const [fieldToSearch, setFieldToSearch] = useState('All');
    const searchLoading = useSelector(state => state.search.searchLoading);
    //const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    //const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    //const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
    const searchQuery = useSelector(state => state.search.searchQuery);
    //const searchState = useSelector(state => state.search);

    const dispatch = useDispatch();

    function updateSearchField(text){
      setFieldToSearch(text);
      dispatch(setQueryFields(text));

    }

    return (
        <>
            <div style={{width: "40em", margin: "auto"}}>
                <InputGroup className="mb-2">
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic">
                            {fieldToSearch}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => updateSearchField('All')}>All text fields</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Title')}>Title</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Abstract')}>Abstract</Dropdown.Item>
                            <Dropdown.Item onClick={() => updateSearchField('Keyword')}>Keyword</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Form.Control inline="true" type="text" id="titleField" name="titleField" value={searchQuery}
                                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                                  onKeyPress={(event) => {
                                      if (event.charCode === 13) {
                                        dispatch(setSearchResultsPage(0));
                                        dispatch(setAuthorFilter(''));
                                        dispatch(searchReferences());
                                      }
                                  }}
                    />
                    <Button inline="true" style={{width: "5em"}}
                            onClick={() => {
                              dispatch(setSearchResultsPage(0));
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
