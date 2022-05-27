import React, {useState} from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {searchReferences, setSearchQuery} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';


const SearchBar = () => {

    const [fieldToSearch, setFieldToSearch] = useState('Title');
    const searchLoading = useSelector(state => state.search.searchLoading);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
    const searchQuery = useSelector(state => state.search.searchQuery);

    const dispatch = useDispatch();

    return (
        <>
            <div style={{width: "40em", margin: "auto"}}>
                <InputGroup className="mb-2">
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic">
                            {fieldToSearch}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => setFieldToSearch('All text fields')}>All text fields</Dropdown.Item>
                            <Dropdown.Item onClick={() => setFieldToSearch('Title')}>Title</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Form.Control inline="true" type="text" id="titleField" name="titleField" value={searchQuery}
                                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                                  onKeyPress={(event) => {
                                      if (event.charCode === 13) {
                                          dispatch(searchReferences(searchQuery, searchFacetsValues, searchFacetsLimits, searchSizeResultsCount));
                                      }
                                  }}
                    />
                    <Button inline="true" style={{width: "5em"}}
                            onClick={() => dispatch(searchReferences(searchQuery, searchFacetsValues, searchFacetsLimits, searchSizeResultsCount))}>
                        {searchLoading ? <Spinner animation="border" size="sm"/> : <span>Search</span>  }
                    </Button>
                </InputGroup>
            </div>
        </>
    )
}

export default SearchBar;
