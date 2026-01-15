import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { showReauthModal, hideReauthModal, setDevTestingReauth } from '../actions/authActions';
import { setTesterMod } from '../actions/loginActions';
import { signOut as amplifySignOut } from 'aws-amplify/auth';

const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;

const DevToolsDropdown = () => {
    const dispatch = useDispatch();
    const dropdownRef = useRef(null);
    const devTestingReauth = useSelector(state => state.isLogged.devTestingReauth);
    const redux_mods = useSelector(state => state.app.mods);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
    const cognitoTester = useSelector(state => state.isLogged.cognitoTester);
    const mods = [...(redux_mods || []), 'No'];

    // Auto-scroll to dropdown when opened on mobile
    const handleDropdownToggle = useCallback((isOpen) => {
        if (isOpen && dropdownRef.current) {
            setTimeout(() => {
                dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }, []);

    const handleTriggerReauthModal = useCallback(async () => {
        dispatch(setDevTestingReauth(true));
        // Sign out from Amplify (but not Redux) so the sign-in form appears
        try {
            await amplifySignOut();
        } catch (error) {
            console.log('Amplify sign out error (may be expected):', error);
        }
        dispatch(showReauthModal());
    }, [dispatch]);

    const handleStopTestingReauth = useCallback(() => {
        dispatch(setDevTestingReauth(false));
        dispatch(hideReauthModal());
    }, [dispatch]);

    // Only show in dev or stage environments
    if (devOrStageOrProd === 'prod') {
        return null;
    }

    // Show tester options if user has tester permission and a MOD
    const showTesterOptions = cognitoMod !== 'No' && cognitoTester === true;

    return (
        <div ref={dropdownRef}>
            <style>{`
                #devtools-nav-dropdown + .dropdown-menu {
                    right: 0 !important;
                    left: auto !important;
                    transform: none !important;
                }
            `}</style>
            <NavDropdown
                title={showTesterOptions && testerMod !== 'No' ? `Dev (${testerMod})` : 'Dev Tools'}
                id="devtools-nav-dropdown"
                onToggle={handleDropdownToggle}
                align="end"
            >
                {devTestingReauth ? (
                    <NavDropdown.Item onClick={handleStopTestingReauth}>
                        Stop Testing Re-Auth
                    </NavDropdown.Item>
                ) : (
                    <NavDropdown.Item onClick={handleTriggerReauthModal}>
                        Trigger Re-Auth Modal
                    </NavDropdown.Item>
                )}
                {showTesterOptions && (
                    <>
                        <NavDropdown.Divider />
                        <NavDropdown.Header>Tester MOD</NavDropdown.Header>
                        {mods.map((mod) => (
                            <NavDropdown.Item
                                key={`testerDropdown ${mod}`}
                                onClick={() => dispatch(setTesterMod(mod))}
                                active={testerMod === mod}
                            >
                                {mod}
                            </NavDropdown.Item>
                        ))}
                    </>
                )}
            </NavDropdown>
        </div>
    );
};

export default DevToolsDropdown;