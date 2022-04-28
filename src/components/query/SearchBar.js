import React, {useState} from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import {Dropdown, InputGroup, Spinner} from 'react-bootstrap';
import {searchReferences} from '../../actions/queryActions';
import {useDispatch, useSelector} from 'react-redux';


const SearchBar = () => {

    const [fieldToSearch, setFieldToSearch] = useState('Title');
    const [searchInputText, setSearchInputText] = useState('');

    const searchLoading = useSelector(state => state.query.searchLoading);
    const searchFacetsValues = useSelector(state => state.query.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.query.searchFacetsLimits);

    const dispatch = useDispatch();

    return (
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
                <Form.Control inline type="text" id="titleField" name="titleField" value={searchInputText}
                              onChange={(e) => setSearchInputText(e.target.value)}
                              onKeyPress={(event) => {
                                  if (event.charCode === 13) {
                                      dispatch(searchReferences(searchInputText, searchFacetsValues, searchFacetsLimits));
                                  }
                              }}
                />
                <Button inline
                        onClick={() => dispatch(searchReferences(searchInputText, searchFacetsValues, searchFacetsLimits))}>
                    Search
                </Button>
            </InputGroup>
            <div style={{height: "3em"}}>
                {searchLoading ?
                    <div>
                        <br/>
                        <Spinner animation="border"/>
                    </div> : null
                }
            </div>
        </div>
    )
}

export default SearchBar;