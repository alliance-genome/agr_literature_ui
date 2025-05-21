// import logo from './logo.svg';

import { useEffect } from 'react';

//import { BrowserRouter, Route } from 'react-router-dom'
//import history from "../history";
// console.log('Router is needed in AppWithRouterAccess.js or pages like https://dev3001.alliancegenome.org/Biblio?action=editor&referenceCurie=AGR:AGR-Reference-0000829611 will not display')
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavigationBar from './NavigationBar'
import NotLoggedInBar from './NotLoggedInBar'
import Search from './Search'
import Biblio from './Biblio'
import Sort from './Sort'
import Flags from './Flags'
import Files from './Files'
import Mining from './Mining'
import Ontomate from './Ontomate'
import Textpresso from './Textpresso'
import Create from './Create'
import Merge from './Merge'
import Reports from './Reports'
import Download from './Download'
import About from './About'
import Tracker from './Tracker'
// import Login from './Login'
import LoginRequired from './LoginRequired'
//import SwaggerComp from './SwaggerUI'
//import Logout from "./Logout";
// import ListGroup from 'react-bootstrap/ListGroup';
// import Navbar from 'react-bootstrap/Navbar';
// import Nav from 'react-bootstrap/Nav';
// import NavItem from 'react-bootstrap/NavItem';
// import NavDropdown from 'react-bootstrap/NavDropdown';
// import Glyphicon from 'react-bootstrap/Glyphicon';
import React from 'react';
import { useNavigate } from 'react-router-dom';
// import { Security, SecureRoute, LoginCallback } from '@okta/okta-react';
import { Security, useOktaAuth } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { useSelector, useDispatch } from 'react-redux';

import { setMods } from '../actions/appActions';

import axios from "axios";

// import { oktaAuthConfig, oktaSignInConfig } from '../config';
import { oktaAuthConfig } from '../config';

const oktaAuth = new OktaAuth(oktaAuthConfig);

// Custom SecureRoute component for React Router v6
const SecureRoute = ({ children }) => {
    const { authState } = useOktaAuth();
    const navigate = useNavigate();
    
    React.useEffect(() => {
        if (authState?.isAuthenticated === false) {
            navigate('/loginRequired', { replace: true });
        }
    }, [authState, navigate]);
    
    if (!authState || !authState.isAuthenticated) {
        return null;
    }
    
    return children;
};

// No secrets here so print out for sanity checking.
console.log("UI_URL -> " + process.env.REACT_APP_UI_URL);
console.log("UI_RESTAPI-> " + process.env.REACT_APP_RESTAPI);
console.log("UI_SW -> " + process.env.REACT_APP_SWAGGERUI);
console.log("UI_DSP -> " + process.env.REACT_APP_DEV_OR_STAGE_OR_PROD);
console.log("UI_ATEAM -> " + process.env.REACT_APP_ATEAM_API_BASE_URL);
console.log(Router);
console.log(oktaAuth);

const AppWithRouterAccess = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
    let documentTitle = 'Literature AGRKB';
    if (devOrStageOrProd === 'prod') { }
      else if (devOrStageOrProd === 'stage') { documentTitle = 'Stage-' + documentTitle; }
      else { documentTitle = devOrStageOrProd + '-' + documentTitle; }
    useEffect(() => {
        document.title = documentTitle;
    }, [documentTitle]);
    useEffect(() => {
      const fetchTaxons = async () => {
        const taxons = await axios.get(process.env.REACT_APP_RESTAPI + "/mod/taxons/default");
        const sortedMods = taxons.data.map(taxon => taxon.mod_abbreviation).sort();
        dispatch(setMods(sortedMods));
      }
      fetchTaxons().finally()
    }, []);

    const customAuthHandler = () => {
        navigate('/loginRequired', { replace: true });
    };

    const restoreOriginalUri = async (_oktaAuth, originalUri) => {
        navigate(toRelativeUrl(originalUri, window.location.origin), { replace: true });
    };

    const oktaMod = useSelector(state => state.isLogged.oktaMod);
    const oktaTester = useSelector(state => state.isLogged.oktaTester);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const classTesterString = (devOrStageOrProd === 'prod') ? 'App App-testing-prod' : 'App App-testing-dev';
    const className = (oktaMod !== testerMod && testerMod !== 'No' && oktaTester) ? classTesterString : 'App';
    return (
        <Security
            oktaAuth={oktaAuth}
            onAuthRequired={customAuthHandler}
            restoreOriginalUri={restoreOriginalUri}
        >
            <div className={className}>
                <NavigationBar />
                <NotLoggedInBar />
                <br />
                <Routes>
                    <Route path='/' element={<Search />} />
                    <Route path='/search' element={<Search />} />
                    <Route path='/biblio' element={<Biblio />} />
                    <Route path='/sort' element={<Sort />} />
                    <Route path='/flags' element={<Flags />} />
                    <Route path='/files' element={<Files />} />
                    <Route path='/mining' element={<Mining />} />
                    <Route path='/ontomate' element={<Ontomate />} />
                    <Route path='/textpresso' element={<Textpresso />} />
                    <Route path='/create' element={<SecureRoute><Create /></SecureRoute>} />
                    <Route path='/merge' element={<Merge />} />
                    <Route path='/reports' element={<Reports />} />
                    <Route path='/download' element={<Download />} />
                    <Route path='/about' element={<About />} />
                    <Route path='/tracker' element={<Tracker />} />
                    {/*<Route path = '/swaggerUI' element={<SwaggerComp />} />*/}
                    <Route path = '/loginRequired' element={<LoginRequired />} />
                </Routes>
            </div>
        </Security>
    );
};
export default AppWithRouterAccess;
