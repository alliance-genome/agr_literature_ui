import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import CognitoSignInWidget from './CognitoSignInWidget';
import { signIn } from '../actions/loginActions';
import { setAuthLoading } from '../actions/authActions';
import { fetchAuthSession } from 'aws-amplify/auth';

const TOKEN_SYNC_KEY = 'auth_token_updated';

const LoginPage = () => {
    const history = useHistory();
    const location = useLocation();
    const dispatch = useDispatch();
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
    const [showHelp, setShowHelp] = useState(false);

    // Get the page user was trying to access (default to home)
    const from = location.state?.from?.pathname || '/';

    // Check if already authenticated on mount
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                const session = await fetchAuthSession();
                if (session.tokens?.idToken) {
                    const idTokenStr = session.tokens.idToken.toString();
                    const email = session.tokens.idToken?.payload?.email || null;
                    const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';
                    dispatch(signIn(userId, idTokenStr, email));
                } else {
                    dispatch(setAuthLoading(false));
                }
            } catch (error) {
                dispatch(setAuthLoading(false));
            }
        };
        checkExistingAuth();
    }, [dispatch]);

    // Redirect when user becomes signed in
    useEffect(() => {
        if (isSignedIn === true) {
            history.replace(from);
        }
    }, [isSignedIn, history, from]);

    const onSuccess = useCallback(async () => {
        try {
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const idTokenStr = session.tokens.idToken.toString();
                const email = session.tokens.idToken?.payload?.email || null;
                const userId = email || session.tokens.idToken?.payload?.sub || 'unknown';
                dispatch(signIn(userId, idTokenStr, email));

                // Broadcast token update to other tabs
                localStorage.setItem(TOKEN_SYNC_KEY, JSON.stringify({
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            console.error('Error during sign in:', error);
        }
    }, [dispatch]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f5f5f5',
        }}>
            <div style={{
                textAlign: 'center',
                marginBottom: '20px',
            }}>
                <h1 style={{
                    fontSize: '1.8rem',
                    color: '#333',
                    marginBottom: '8px',
                }}>
                    Alliance Bibliography Central
                </h1>
            </div>
            <div style={{
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
            }}>
                <CognitoSignInWidget onSuccess={onSuccess} />
            </div>
            <div style={{
                marginTop: '20px',
                textAlign: 'center',
            }}>
                <a
                    href="#help"
                    onClick={(e) => { e.preventDefault(); setShowHelp(true); }}
                    style={{ color: '#666', fontSize: '0.9rem' }}
                >
                    Need help signing in?
                </a>
            </div>

            <Modal show={showHelp} onHide={() => setShowHelp(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Account Help</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    &nbsp;&nbsp;The Sign In button has a place for Email, enter the one you used for okta Sign In.<br/><br/>
                    &nbsp;&nbsp;Some curators already have an AI-curation account, in which case you don't need to create/reset your account, you can use that email and password.<br/><br/>
                    &nbsp;&nbsp;If you haven't signed on there, you'll have to reset your password by clicking on "Forgot your password?" and following the directions.  Then you can sign in by putting in the email and the new cognito password.<br/><br/>

                    &nbsp;&nbsp;Password requirements<br/>
                    &bull; Minimum 12 characters<br/>
                    &bull; At least one uppercase letter (A-Z)<br/>
                    &bull; At least one lowercase letter (a-z)<br/>
                    &bull; At least one number (0-9)<br/>
                    &bull; At least one symbol (!@#$%^&*()_-+=)<br/><br/>

                    &nbsp;&nbsp;This is not a google Sign In, so you won't be able to sign in by signing on to google with your google password.<br/><br/>

                    &nbsp;&nbsp;For help setting up a new account please contact the administrator for your MOD or the Team where you are working.<br/><br/>
                    <Container fluid>
                        <Row><Col>Chris Tabone</Col><Col>FB</Col><Col>Specialist</Col></Row>
                        <Row><Col>Olin Blodgett</Col><Col>MGI</Col><Col>A-Team</Col></Row>
                        <Row><Col>Jeff De Pons</Col><Col>RGD</Col><Col>A-Team</Col></Row>
                        <Row><Col>Shuai Weng</Col><Col>SGD</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Valerio Arnaboldi</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Juancarlos Chan</Col><Col>WB</Col><Col>Blue-Team</Col></Row>
                        <Row><Col>Todd Harris</Col><Col>WB</Col><Col></Col></Row>
                        <Row><Col>Ryan Martin</Col><Col>ZFIN</Col><Col></Col></Row>
                    </Container>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LoginPage;
