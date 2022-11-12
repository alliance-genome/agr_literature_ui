import React from 'react';

import { useLocation } from 'react-router-dom';
import OktaSignInWidget from './OktaSignInWidget';
import { useOktaAuth } from '@okta/okta-react';
import { useEffect } from 'react';
import { signIn, signOut } from "../actions/loginActions";
import { useSelector, useDispatch } from 'react-redux';

import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

import Button from 'react-bootstrap/Button';
import NavDropdown from 'react-bootstrap/NavDropdown';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserCircle } from '@fortawesome/free-solid-svg-icons'


const Login = ({config}) => {
    const loggedInUser = useSelector(state => state.isLogged.userId);
    const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
    const accessToken = useSelector(state => state.isLogged.accessToken);
    // to have a version of the okta token text wrapped at 60 character, if needed for display
    // const textWrapAccessToken = (accessToken !== null) ? accessToken.match(/.{1,60}/g).join('\n') : '';

    // const { oktaAuth, authState,authService } = useOktaAuth();
    const { authState, oktaAuth } = useOktaAuth();
    // const [isSignedIn, setIsSignedIn] = useState(authState.isAuthenticated? true:false);
    // const [userId, setUserId] = useState('');
    const dispatch = useDispatch();
    useEffect(() => {
        if (!authState.isAuthenticated) {
            // When user isn't authenticated, forget any user info
            dispatch(signOut())
        } else {
            dispatch(signIn(authState.accessToken.claims.sub, authState.accessToken.accessToken))
        }
    }, [dispatch, authState, oktaAuth]);
    // const location = useLocation();
    const location_fullpath = useLocation().pathname + '?' + (new URLSearchParams(useLocation().search)).toString()
    const onSuccess = (token) => {
        oktaAuth.setOriginalUri(location_fullpath)
        oktaAuth.handleLoginRedirect(token);
    };

    const onError = (err) => {
        console.log('error logging in', err);
    };

    if (authState.isPending) {
        console.log("is pending")
        return null; }

    const onSignOutClick = async () => {
        // Will redirect to Okta to end the session then redirect back to the configured `postLogoutRedirectUri`
        // await oktaAuth.signOut({postLogoutRedirectUri:location_fullpath});
        await oktaAuth.signOut();
        // setIsSignedIn(false)
    }

    const renderAuthButton = () => {
        if (!authState.isAuthenticated) {
            return(
            <Popup trigger={<Button as="input" type="button" variant="light" value="Sign In" size="sm" /> } modal>
                <span> <OktaSignInWidget
                    config={config}
                    onSuccess={onSuccess}
                    onError={onError}/>
                </span>
            </Popup>)
        } else if (authState.isAuthenticated) {
            return(
	      <NavDropdown title={<FontAwesomeIcon icon={faUserCircle} />} alignRight id="basic-nav-dropdown">
                <NavDropdown.Item >{loggedInUser}</NavDropdown.Item>
                <NavDropdown.Item >
                  <Button as="input" type="button" variant="primary" value="Sign Out" size="sm" onClick={onSignOutClick} />
                </NavDropdown.Item>
                {oktaGroups !== null && oktaGroups.map((optionValue, index) => (
                  <NavDropdown.Item key={optionValue}>{optionValue}</NavDropdown.Item>
                ))}
                <NavDropdown.Item style={{whiteSpace: 'normal', color: 'blue', textDecoration: 'underline'}} 
                  onClick={() => { navigator.clipboard.writeText(accessToken); } } >copy okta token</NavDropdown.Item>
              </NavDropdown>)
        } else {
            return(
                <OktaSignInWidget
                    config={config}
                    onSuccess={onSuccess}
                    onError={onError}/>)
        }
    }

    return(<div>
        {renderAuthButton()}
    </div>)
};

export default Login
