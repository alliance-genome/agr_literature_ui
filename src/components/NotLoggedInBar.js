

import Alert from 'react-bootstrap/Alert'

import { useSelector } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const NotLoggedInBar = () => {
  const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
  return (
    (!isSignedIn) && 
    <Alert style={{position: 'fixed', top: '3.5em', left: '0px', width: '100%', zIndex:9999}} variant='danger'><FontAwesomeIcon icon={faExclamationTriangle} /> You are not signed in. Please sign in if you want to make changes. <FontAwesomeIcon icon={faExclamationTriangle} /></Alert>
  )
}

export default NotLoggedInBar
