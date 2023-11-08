import { useEffect } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
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
import Download from './Download'
import About from './About'
import Tracker from './Tracker'
import LoginRequired from './LoginRequired'
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Security, SecureRoute } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { useSelector } from 'react-redux';
import { oktaAuthConfig } from '../config';

const oktaAuth = new OktaAuth(oktaAuthConfig);

// No secrets here so print out for sanity checking.
console.log("UI_URL -> " + process.env.REACT_APP_UI_URL);
console.log("UI_RESTAPI-> " + process.env.REACT_APP_RESTAPI);
console.log("UI_SW -> " + process.env.REACT_APP_SWAGGERUI);
console.log("UI_DSP -> " + process.env.REACT_APP_DEV_OR_STAGE_OR_PROD);
console.log("UI_ATEAM -> " + process.env.REACT_APP_ATEAM_API_BASE_URL);
console.log(Router);
console.log(oktaAuth);

const AppWithRouterAccess = () => {
    const history = useHistory();

    const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;
    let documentTitle = 'Literature AGRKB';
    if (devOrStageOrProd === 'prod') { }
      else if (devOrStageOrProd === 'stage') { documentTitle = 'Stage-' + documentTitle; }
      else { documentTitle = devOrStageOrProd + '-' + documentTitle; }
    useEffect(() => {
        document.title = documentTitle;
    }, [documentTitle]);

    const customAuthHandler = () => {
        history.replace('/loginRequired');
    };

    const restoreOriginalUri = async (_oktaAuth, originalUri) => {
        history.replace(toRelativeUrl(originalUri, window.location.origin));
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
                <Route path='/' exact={true} component={Search}/>
                <Route path='/search' component={Search} />
                <Route path='/biblio' component={Biblio} />
                <Route path='/sort' component={Sort} />
                <Route path='/flags' component={Flags} />
                <Route path='/files' component={Files} />
                <Route path='/mining' component={Mining} />
                <Route path='/ontomate' component={Ontomate} />
                <Route path='/textpresso' component={Textpresso} />
                <SecureRoute path='/create' component={Create} />
                <Route path='/merge' component={Merge} />
                <Route path='/download' component={Download} />
                <Route path='/about' component={About} />
                <Route path='/tracker' component={Tracker} />
                {/*<Route path = '/swaggerUI' component={SwaggerComp} />*/}
                <Route path = '/loginRequired' component={LoginRequired} />
            </div>
        </Security>
    );
};
export default AppWithRouterAccess;
