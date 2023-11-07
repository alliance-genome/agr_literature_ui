import {useSelector} from "react-redux";
import Alert from "react-bootstrap/Alert";
import axios from "axios";
import {useEffect, useState} from "react";


const ateamApiBaseUrl = process.env.REACT_APP_ATEAM_API_BASE_URL;


export const AlertAteamApiDown = () => {

    const accessToken = useSelector(state => state.isLogged.accessToken);
    const [status, setStatus] = useState(true);

    useEffect(() => {
        if(accessToken) {
            testAteamAPI(accessToken, setStatus);
        }
    }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps


    if(!status){
        return (
            <Alert className="ateam-alert" variant="danger" onClose={() => setStatus(true)} dismissible>
                <Alert.Heading>Looks like {ateamApiBaseUrl} is down</Alert.Heading>
            </Alert>
        )}
    else{ return null;}
}

const testAteamAPI = (accessToken, setStatus) => {
    const ateamApiUrl = process.env.REACT_APP_RESTAPI + '/check/ateamapi';
    axios.get(ateamApiUrl, {
        headers: {
            'content-type': 'application/json'
        }
    })
        .then(res => {
            const esindex = (element) => element.name === "Elasticsearch Indexing health check";
            const elasticsearch = res.data.checks.find(esindex);
            if (elasticsearch.status === "UP") {
                setStatus(true);
            }
            else{
                setStatus(false);
            }
        })
        .catch(err => {
            setStatus(false);
        })
}