import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Dropdown from 'react-bootstrap/Dropdown';
import Badge from 'react-bootstrap/Badge';
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
        <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <style>{`
                .tester-dropdown .dropdown-menu {
                    right: 0 !important;
                    left: auto !important;
                    transform: none !important;
                }
                .tester-dropdown .dropdown-toggle::after {
                    display: none;
                }
            `}</style>

            {/* Re-Auth Badge/Button */}
            <Badge
                as="button"
                onClick={handleTriggerReauthModal}
                style={{
                    fontSize: '0.85rem',
                    padding: '5px 10px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                }}
                title="Click to trigger re-auth modal"
            >
                Test Re-Auth
            </Badge>

            {/* Tester MOD Dropdown */}
            {showTesterOptions && (
                <Dropdown
                    className="tester-dropdown"
                    onToggle={handleDropdownToggle}
                    align="end"
                >
                    <Dropdown.Toggle
                        as="div"
                        id="tester-mod-dropdown"
                        style={{ cursor: 'pointer' }}
                    >
                        <Badge
                            style={{
                                fontSize: '0.85rem',
                                padding: '5px 10px',
                                backgroundColor: testerMod !== 'No' ? '#f5b041' : '#5a6268',
                                color: testerMod !== 'No' ? '#333' : '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                            title="Click to select tester MOD"
                        >
                            Tester: {testerMod}
                            <span style={{ fontSize: '0.7rem' }}>&#9660;</span>
                        </Badge>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Header>Select Tester MOD</Dropdown.Header>
                        {mods.map((mod) => (
                            <Dropdown.Item
                                key={`testerDropdown ${mod}`}
                                onClick={() => dispatch(setTesterMod(mod))}
                                active={testerMod === mod}
                            >
                                {mod}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            )}
        </div>
    );
};

export default DevToolsDropdown;