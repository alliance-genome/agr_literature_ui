import {useDispatch, useSelector} from "react-redux";
import Alert from "react-bootstrap/Alert";
import axios from "axios";
import {setAteamApiConnectionStatus} from "../actions/biblioActions";


const ateamApiBaseUrl = process.env.REACT_APP_ATEAM_API_BASE_URL;


export const AlertAteamApiDown = () => {

    const dispatch = useDispatch();
    const ateamApiConnectionStatus = useSelector(state => state.biblio.ateamApiConnectionStatus);


    if(!ateamApiConnectionStatus){
        return (
            <Alert variant="danger" onClose={() => dispatch(setAteamApiConnectionStatus(true))} dismissible>
                <Alert.Heading>Looks like {ateamApiBaseUrl} is down</Alert.Heading>
            </Alert>
        )}
    else{ return null;}
}

export const testAteamAPI = (accessToken) => {
    return dispatch => {
        const ateamApiUrl = ateamApiBaseUrl + 'api/atpterm/ATP:0000002/descendants'
        axios.get(ateamApiUrl, {
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + accessToken
            }
        })
            .then(res => {
                console.log('working');
                dispatch(setAteamApiConnectionStatus(true));
            })
            .catch(err => {
                console.log('not working');
                dispatch(setAteamApiConnectionStatus(false));
            })
    }
}