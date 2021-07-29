import React from 'react';

import { useLocation } from 'react-router-dom';
import OktaSignInWidget from './OktaSignInWidget';
import { useOktaAuth } from '@okta/okta-react';
import  {  useEffect } from 'react';
import {signIn, signOut} from "../actions/loginActions";
import {  useDispatch } from 'react-redux';

import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';




const Login = ({config}) => {

    //const { oktaAuth, authState,authService  } = useOktaAuth();
    const { authState, oktaAuth } = useOktaAuth();
    //const [isSignedIn, setIsSignedIn] = useState(authState.isAuthenticated? true:false);
    //const [userId, setUserId] = useState('');
    const dispatch = useDispatch();
    useEffect(() => {

        if (!authState.isAuthenticated) {
            // When user isn't authenticated, forget any user info
            dispatch(signOut())
        } else {
            dispatch(signIn(authState.accessToken.claims.sub, authState.accessToken.accessToken))

        }
    }, [dispatch,authState, oktaAuth]);
    const location = useLocation();
    const onSuccess = (token) => {
        oktaAuth.setOriginalUri(location.pathname)
        oktaAuth.handleLoginRedirect(token);
    };

    const onError = (err) => {
        console.log('error logging in', err);
    };

    if (authState.isPending)  {
        console.log("is pending")
        return null;}




    const onSignOutClick = async () => {

        // Will redirect to Okta to end the session then redirect back to the configured `postLogoutRedirectUri`
        //await oktaAuth.signOut({postLogoutRedirectUri:location.pathname});
        await oktaAuth.signOut();
        //setIsSignedIn(false)

    }

    const renderAuthButton =  () =>{
        if (!authState.isAuthenticated) {
            return(
            <Popup trigger={<button className="button"> Sign In </button>} modal>
                <span> <OktaSignInWidget
                    config={config}
                    onSuccess={onSuccess}
                    onError={onError}/>
                </span>
            </Popup>)
        } else if(authState.isAuthenticated){
            return(<button onClick={onSignOutClick} className='button'>
                Sign Out
            </button>)
        } else{
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
