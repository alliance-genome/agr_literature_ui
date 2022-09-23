import React, {useState} from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {searchReferences, setSearchQuery} from '../../actions/searchActions';
import {useDispatch, useSelector} from 'react-redux';


const SearchBar = () => {

    const [fieldToSearch, setFieldToSearch] = useState('Title');
    const [xrefQuery, setXrefQuery] = useState('');
    const searchLoading = useSelector(state => state.search.searchLoading);
    const searchFacetsValues = useSelector(state => state.search.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.search.searchFacetsLimits);
    const searchSizeResultsCount = useSelector(state => state.search.searchSizeResultsCount);
    const searchQuery = useSelector(state => state.search.searchQuery);

    const dispatch = useDispatch();

    const searchRefOrXref = () => {
        let query = "";
        if (fieldToSearch === "ID") {
            query = xrefQuery;
        } else {
            query = searchQuery;
        }
        dispatch(searchReferences(query, fieldToSearch, searchFacetsValues, searchFacetsLimits, searchSizeResultsCount))
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
                            <Dropdown.Item onClick={() => {
                                setFieldToSearch('Title');
                            }}>Title</Dropdown.Item>
                            <Dropdown.Item onClick={() => {
                                setFieldToSearch('ID');
                            }}>ID</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Form.Control inline="true" type="text" id="titleField" name="titleField"
                                  value={fieldToSearch === "ID" ? xrefQuery : searchQuery}
                                  onChange={(e) => {
                                      if (fieldToSearch === "ID") {
                                          setXrefQuery(e.target.value);
                                      } else {
                                          dispatch(setSearchQuery(e.target.value));
                                      }
                                  }}
                                  onKeyPress={(event) => {
                                      if (event.charCode === 13) {
                                          searchRefOrXref();
                                      }
                                  }}
                    />
                    <Button inline="true" style={{width: "5em"}} onClick={searchRefOrXref}>
                        {searchLoading ? <Spinner animation="border" size="sm"/> : <span>Search</span>  }
                    </Button>
                </InputGroup>
            </div>
        </>
    )
}

export default SearchBar;
