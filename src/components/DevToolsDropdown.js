import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { showReauthModal, hideReauthModal, setDevTestingReauth } from '../actions/authActions';

const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;

const DevToolsDropdown = () => {
    const dispatch = useDispatch();
    const dropdownRef = useRef(null);
    const devTestingReauth = useSelector(state => state.isLogged.devTestingReauth);

    // Auto-scroll to dropdown when opened on mobile
    const handleDropdownToggle = useCallback((isOpen) => {
        if (isOpen && dropdownRef.current) {
            setTimeout(() => {
                dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }, []);

    const handleTriggerReauthModal = useCallback(() => {
        dispatch(setDevTestingReauth(true));
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

    return (
        <div ref={dropdownRef}>
            <NavDropdown
                title="Dev Tools"
                id="devtools-nav-dropdown"
                onToggle={handleDropdownToggle}
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
            </NavDropdown>
        </div>
    );
};

export default DevToolsDropdown;