import {useDispatch, useSelector} from "react-redux";
import Alert from "react-bootstrap/Alert";
import axios from "axios";
import {useEffect, useState} from "react";


const ateamApiBaseUrl = process.env.REACT_APP_ATEAM_API_BASE_URL;


export const AlertAteamApiDown = () => {

    //const dispatch = useDispatch();
    //const ateamApiConnectionStatus = useSelector(state => state.biblio.ateamApiConnectionStatus);
    const accessToken = useSelector(state => state.isLogged.accessToken);

    const [status, setStatus] = useState(true);
    useEffect(() => {
        testAteamAPI(accessToken, setStatus);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    if(!status){
        return (
            <Alert variant="danger" onClose={() => setStatus(true)} dismissible>
                <Alert.Heading>Looks like {ateamApiBaseUrl} is down</Alert.Heading>
            </Alert>
        )}
    else{ return null;}
}

const testAteamAPI = (accessToken, setStatus) => {
    const ateamApiUrl = ateamApiBaseUrl + 'api/atpterm/ATP:0000002/descendants'
    axios.get(ateamApiUrl, {
        headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer ' + accessToken
        }
    })
        .then(res => {
            console.log('working');
            setStatus(true);
        })
        .catch(err => {
            console.log('not working');
            setStatus(false);
        })
}