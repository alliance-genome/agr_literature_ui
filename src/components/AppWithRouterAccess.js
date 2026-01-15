import { useEffect } from 'react';

import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Search from './Search';
import Biblio from './Biblio';
import Sort from './Sort';
import Flags from './Flags';
import Files from './Files';
import Mining from './Mining';
import Ontomate from './Ontomate';
import Textpresso from './Textpresso';
import Create from './Create';
import Merge from './Merge';
import Reports from './Reports';
import Download from './Download';
import BulkSubmission from './BulkSubmission';
import About from './About';
import Tracker from './Tracker';
import LoginPage from './LoginPage';
import ReAuthModal from './ReAuthModal';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { setMods } from '../actions/appActions';
import { DebeziumStatusAlert } from './DebeziumStatusAlert';
import { useTokenSync } from '../hooks/useTokenSync';

import { api } from '../api';

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

// PrivateRoute component for protected routes - redirects to login if not authenticated
const PrivateRoute = ({ component: Component, ...rest }) => {
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);
    return (
        <Route
            {...rest}
            render={(props) =>
                isSignedIn ? (
                    <Component {...props} />
                ) : (
                    <Redirect to={{
                        pathname: '/login',
                        state: { from: props.location }
                    }} />
                )
            }
        />
    );
};

const AppWithRouterAccess = () => {
    const dispatch = useDispatch();

    // Initialize cross-tab token synchronization
    useTokenSync();

    const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
    const isSignedIn = useSelector(state => state.isLogged.isSignedIn);

    let documentTitle = 'Literature AGRKB';
    if (devOrStageOrProd === 'prod') { }
      else if (devOrStageOrProd === 'stage') { documentTitle = 'Stage-' + documentTitle; }
      else { documentTitle = devOrStageOrProd + '-' + documentTitle; }

    useEffect(() => {
        document.title = documentTitle;
    }, [documentTitle]);

    // Fetch MOD taxons only when signed in (API requires auth)
    useEffect(() => {
      if (!isSignedIn) return;

      const fetchTaxons = async () => {
        try {
          const taxons = await api.get("/mod/taxons/default");
          const sortedMods = taxons.data.map(taxon => taxon.mod_abbreviation).sort();
          dispatch(setMods(sortedMods));
        } catch (error) {
          console.error('Error fetching taxons:', error);
        }
      }
      fetchTaxons();
    }, [dispatch, isSignedIn]);

    const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
    const cognitoTester = useSelector(state => state.isLogged.cognitoTester);
    const testerMod = useSelector(state => state.isLogged.testerMod);
    const classTesterString = (devOrStageOrProd === 'prod') ? 'App App-testing-prod' : 'App App-testing-dev';
    const className = (cognitoMod !== testerMod && testerMod !== 'No' && cognitoTester) ? classTesterString : 'App';

    return (
        <div className={className}>
            <ReAuthModal />
            <Switch>
                <Route path='/login' component={LoginPage} />
                <Route>
                    <NavigationBar />
                    <DebeziumStatusAlert />
                    <br />
                    <PrivateRoute path='/' exact={true} component={Search}/>
                    <PrivateRoute path='/search' component={Search} />
                    <PrivateRoute path='/biblio' component={Biblio} />
                    <PrivateRoute path='/sort' component={Sort} />
                    <PrivateRoute path='/flags' component={Flags} />
                    <PrivateRoute path='/files' component={Files} />
                    <PrivateRoute path='/mining' component={Mining} />
                    <PrivateRoute path='/ontomate' component={Ontomate} />
                    <PrivateRoute path='/textpresso' component={Textpresso} />
                    <PrivateRoute path='/create' component={Create} />
                    <PrivateRoute path='/merge' component={Merge} />
                    <PrivateRoute path='/reports' component={Reports} />
                    <PrivateRoute path='/download' component={Download} />
                    <PrivateRoute path='/bulkSubmission' component={BulkSubmission} />
                    <PrivateRoute path='/about' component={About} />
                    <PrivateRoute path='/tracker' component={Tracker} />
                </Route>
            </Switch>
        </div>
    );
};

export default AppWithRouterAccess;
