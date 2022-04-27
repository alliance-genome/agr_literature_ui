import React, {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fetchInitialFacets} from "../../actions/queryActions";

const Facets = () => {

    const searchFacets = useSelector(state => state.query.searchFacets);
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
                        {bucket.key} ({bucket.doc_count})
                    </div>)}
                </div>
            )}
        </div>
    )
}

export default Facets;