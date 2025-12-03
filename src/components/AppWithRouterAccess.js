// import logo from './logo.svg';

import { useEffect } from 'react';

//import { BrowserRouter, Route } from 'react-router-dom'
//import history from "../history";
// console.log('Router is needed in AppWithRouterAccess.js or pages like https://dev3001.alliancegenome.org/Biblio?action=editor&referenceCurie=AGR:AGR-Reference-0000829611 will not display')
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
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
import BulkSubmission from './BulkSubmission'
import About from './About'
import Tracker from './Tracker'
// import Login from './Login'
import LoginRequired from './LoginRequired'
//import Logout from "./Logout";
// import ListGroup from 'react-bootstrap/ListGroup';
// import Navbar from 'react-bootstrap/Navbar';
// import Nav from 'react-bootstrap/Nav';
// import NavItem from 'react-bootstrap/NavItem';
// import NavDropdown from 'react-bootstrap/NavDropdown';
// import Glyphicon from 'react-bootstrap/Glyphicon';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { setMods } from '../actions/appActions';
import { DebeziumStatusAlert } from './DebeziumStatusAlert';

import axios from "axios";

// AWS Amplify imports
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from '../config';

// Configure Amplify
Amplify.configure(cognitoConfig);

// No secrets here so print out for sanity checking.
console.log("UI_URL -> " + process.env.REACT_APP_UI_URL);
console.log("UI_RESTAPI-> " + process.env.REACT_APP_RESTAPI);
console.log("UI_SW -> " + process.env.REACT_APP_SWAGGERUI);
console.log("UI_DSP -> " + process.env.REACT_APP_DEV_OR_STAGE_OR_PROD);
console.log(Router);

// PrivateRoute component for protected routes
const PrivateRoute = ({ component: Component, ...rest }) => {
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
    return (
        <Route
            {...rest}
            render={(props) =>
                isSignedIn ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/loginRequired" />
                )
            }
        />
    );
};

const AppWithRouterAccess = () => {
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
    }, [dispatch]);

    const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
    const cognitoTester = useSelector(state => state.isLogged.cognitoTester);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const classTesterString = (devOrStageOrProd === 'prod') ? 'App App-testing-prod' : 'App App-testing-dev';
    const className = (cognitoMod !== testerMod && testerMod !== 'No' && cognitoTester) ? classTesterString : 'App';

    return (
        <div className={className}>
            <NavigationBar />
            <NotLoggedInBar />
            <DebeziumStatusAlert />
            <br />
            <Route path='/' exact={true} component={Search}/>
            <Route path='/search' component={Search} />
            <Route path='/biblio' component={Biblio} />
            <Route path='/sort' component={Sort} />
            <Route path='/flags' component={Flags} />
            <Route path='/files' component={Files} />
            <Route path='/mining' component={Mining} />
            <Route path='/ontomate' component={Ontomate} />
            <Route path='/textpresso' component={Textpresso} />
            <PrivateRoute path='/create' component={Create} />
            <Route path='/merge' component={Merge} />
            <Route path='/reports' component={Reports} />
            <Route path='/download' component={Download} />
            <Route path='/bulkSubmission' component={BulkSubmission} />
            <Route path='/about' component={About} />
            <Route path='/tracker' component={Tracker} />
            <Route path = '/loginRequired' component={LoginRequired} />
        </div>
    );
};
export default AppWithRouterAccess;
