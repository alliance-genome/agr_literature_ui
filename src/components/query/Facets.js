import React, {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fetchInitialFacets, searchReferences, setSearchFacetsValues} from '../../actions/queryActions';
import Form from 'react-bootstrap/Form';
import {Badge} from 'react-bootstrap';

const Facets = () => {

    const searchFacets = useSelector(state => state.query.searchFacets);
    const searchQuery = useSelector(state => state.query.searchQuery);
    const searchFacetsValues = useSelector(state => state.query.searchFacetsValues);
    const searchFacetsLimits = useSelector(state => state.query.searchFacetsLimits);
    const dispatch = useDispatch();

    useEffect(() => {
        if (Object.keys(searchFacets).length === 0) {
            dispatch(fetchInitialFacets());
        }
    }, [])

    return (
        <div style={{textAlign: "left", paddingLeft: "1em"}}>
            {Object.entries(searchFacets).map(([key, value]) =>
                <div>
                    <h5>{key.replace('.keyword', '').replace('_', ' ')}</h5>
                    {value.buckets.map(bucket => <div style={{paddingLeft: "1em"}}>
                        <Form.Check inline type="checkbox"
                                    checked={searchFacetsValues.hasOwnProperty(key) && searchFacetsValues[key].includes(bucket.key)}
                                    onChange={(evt) => {
                                        let newSearchFacetsValues = searchFacetsValues;
                                        if (evt.target.checked) {
                                            if (!newSearchFacetsValues.hasOwnProperty(key)) {
                                                newSearchFacetsValues[key] = []
                                            }
                                            newSearchFacetsValues[key].push(bucket.key)
                                        } else {
                                            newSearchFacetsValues[key] = newSearchFacetsValues[key].filter(
                                                e => e !== bucket.key)
                                            if (newSearchFacetsValues[key].length === 0) {
                                                delete newSearchFacetsValues[key];
                                            }
                                        }
                                        dispatch(searchReferences(searchQuery, newSearchFacetsValues, searchFacetsLimits));
                                    }}/>
                        {bucket.key} <Badge variant="secondary">{bucket.doc_count}</Badge>
                    </div>)}
                </div>
            )}
        </div>
    )
}

export default Facets;