// import logo from './logo.svg';

//import { BrowserRouter, Route } from 'react-router-dom'
//import history from "../history";
// console.log('Router is needed in AppWithRouterAccess.js or pages like https://dev3001.alliancegenome.org/Biblio?action=editor&referenceCurie=AGR:AGR-Reference-0000829611 will not display')
import { BrowserRouter as Router, Route } from 'react-router-dom';
import NavigationBar from './NavigationBar'
import NotLoggedInBar from './NotLoggedInBar'
import Home from './Home'
import Query from './Query'
import Biblio from './Biblio'
import Sort from './Sort'
import Flags from './Flags'
import Files from './Files'
import Mining from './Mining'
import Ontomate from './Ontomate'
import Textpresso from './Textpresso'
import Create from './Create'
import Merge from './Merge'
import About from './About'
// import Login from './Login'
import LoginRequired from './LoginRequired'
import SwaggerComp from './SwaggerUI'
//import Logout from "./Logout";
// import ListGroup from 'react-bootstrap/ListGroup';
// import Navbar from 'react-bootstrap/Navbar';
// import Nav from 'react-bootstrap/Nav';
// import NavItem from 'react-bootstrap/NavItem';
// import NavDropdown from 'react-bootstrap/NavDropdown';
// import Glyphicon from 'react-bootstrap/Glyphicon';
import React from 'react';
// import { useHistory, Switch } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
// import { Security, SecureRoute, LoginCallback } from '@okta/okta-react';
import { Security, SecureRoute } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';

// import { oktaAuthConfig, oktaSignInConfig } from '../config';
import { oktaAuthConfig } from '../config';

const oktaAuth = new OktaAuth(oktaAuthConfig);

console.log(Router)
console.log(oktaAuth)

const AppWithRouterAccess = () => {
    const history = useHistory();

    const customAuthHandler = () => {
        history.replace('/loginRequired');
    };

    const restoreOriginalUri = async (_oktaAuth, originalUri) => {
        history.replace(toRelativeUrl(originalUri, window.location.origin));
    };

    return (
        <Security
            oktaAuth={oktaAuth}
            onAuthRequired={customAuthHandler}
            restoreOriginalUri={restoreOriginalUri}
        >
            <div className="App">
                <NavigationBar />
                <NotLoggedInBar />
                <br />
                <Route path='/' exact={true} component={Home}/>
                <Route path='/query' component={Query} />
                <Route path='/biblio' component={Biblio} />
                <Route path='/sort' component={Sort} />
                <Route path='/flags' component={Flags} />
                <Route path='/files' component={Files} />
                <Route path='/mining' component={Mining} />
                <Route path='/ontomate' component={Ontomate} />
                <Route path='/textpresso' component={Textpresso} />
                <SecureRoute path='/create' component={Create} />
                <SecureRoute path='/merge' component={Merge} />
                <Route path='/about' component={About} />
                <Route path = '/swaggerUI' component={SwaggerComp} />
                <Route path = '/loginRequired' component={LoginRequired} />
            </div>
        </Security>
    );
};
export default AppWithRouterAccess;
