

import Alert from 'react-bootstrap/Alert'

import { useSelector } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const NotLoggedInBar = () => {
  const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
  return (
    (!isSignedIn) && 
    <Alert variant='danger'><FontAwesomeIcon icon={faExclamationTriangle} /> You are not signed in. Please sign in if you want to make changes. <FontAwesomeIcon icon={faExclamationTriangle} /></Alert>
  )
}

export default NotLoggedInBar
