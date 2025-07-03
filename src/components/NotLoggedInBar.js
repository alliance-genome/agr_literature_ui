

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
    <Alert className={`fade alert alert-danger show ${loggedClass}`} variant='danger'><FontAwesomeIcon icon={faExclamationTriangle} /> You are not signed in. Please sign in to edit, tag, or download PDFs. <FontAwesomeIcon icon={faExclamationTriangle} /><br/>Turn off cross site tracking protection and allow third party cookies to avoid <a href="https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1122140162/Unexpected+Logout" rel="noreferrer noopener" target="_blank">unexpected logout</a>.</Alert>
  )
}

export default NotLoggedInBar
