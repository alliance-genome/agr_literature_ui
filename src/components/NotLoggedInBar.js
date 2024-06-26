

import Alert from 'react-bootstrap/Alert'

import { useSelector } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const NotLoggedInBar = () => {
  const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
  const everSignedIn = useSelector(state => state.isLogged.everSignedIn);
  const loggedClass = (everSignedIn) ? 'NotLoggedInAlert-everLogged' : '';
  return (
    (!isSignedIn) && 
    <Alert className={`fade alert alert-danger show ${loggedClass}`} variant='danger'><FontAwesomeIcon icon={faExclamationTriangle} /> You are not signed in. Please sign in to edit, tag, or download PDFs. <FontAwesomeIcon icon={faExclamationTriangle} /></Alert>
  )
}

export default NotLoggedInBar
