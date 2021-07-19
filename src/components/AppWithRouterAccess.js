// import logo from './logo.svg';

//import { BrowserRouter, Route } from 'react-router-dom'
//import history from "../history";
import { BrowserRouter as Router, Route } from 'react-router-dom';
import NavigationBar from './NavigationBar'
import Home from './Home'
import Query from './Query'
import Biblio from './Biblio'
import Flags from './Flags'
import Files from './Files'
import Mining from './Mining'
import Ontomate from './Ontomate'
import Textpresso from './Textpresso'
import Create from './Create'
import About from './About'
import Login from './Login'
import SwaggerComp from './SwaggerUI'
//import Logout from "./Logout";
// import ListGroup from 'react-bootstrap/ListGroup';
// import Navbar from 'react-bootstrap/Navbar';
// import Nav from 'react-bootstrap/Nav';
// import NavItem from 'react-bootstrap/NavItem';
// import NavDropdown from 'react-bootstrap/NavDropdown';
// import Glyphicon from 'react-bootstrap/Glyphicon';
import React from 'react';
import { useHistory, Switch } from 'react-router-dom';
import { Security, SecureRoute, LoginCallback } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';

import { oktaAuthConfig, oktaSignInConfig } from '../config';

const oktaAuth = new OktaAuth(oktaAuthConfig);

console.log(oktaAuth)

const AppWithRouterAccess = () => {
    const history = useHistory();

    const customAuthHandler = () => {
        history.push('/');
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
                    <br />
                    <Route path='/' exact={true} component={Home}/>
                    <Route path='/query' component={Query} />
                    <Route path='/biblio' component={Biblio} />
                    <Route path='/flags' component={Flags} />
                    <Route path='/files' component={Files} />
                    <Route path='/mining' component={Mining} />
                    <Route path='/ontomate' component={Ontomate} />
                    <Route path='/textpresso' component={Textpresso} />
                    <SecureRoute path='/create' component={Create} />
                    <Route path='/about' component={About} />
                    <Route path = '/swaggerUI' component={SwaggerComp} />



                </div>
            </Security>

    );
};
export default AppWithRouterAccess;

//<Route path='/login/callback' component={LoginCallback} />

//<Route render={() => <Login config={oktaSignInConfig} />} />

// this doesn't seem true.  Using Router instead of BrowserRouter makes the <Link and <Redirect reset store
// Warning: <BrowserRouter> ignores the history prop. To use a custom history, use `import { Router }` instead of `import { BrowserRouter as Router }`.
//     <BrowserRouter history={history}>
//     </BrowserRouter>


/*
var oktaSignIn = new OktaSignIn({
  baseUrl: orgUrl,
  clientId: 'smBXcoabniBOUsja0A6b7', // here
  redirectUri: 'http://localhost:3000',
  authParams: {
    issuer: 'default',
    responseType: 'id_token',
    scopes: ['openid', 'whatever'],
  },
  idps:[
    { type: 'google', id: '0oadrrh812O9sbabE0h7' },
    { type: 'facebook', id: '0oadtgaq74qR0qdD20h7'}
  ],
  idpDisplay: "PRIMARY",
  i18n: {
    en: {
      'password.forgot.email.or.username.placeholder': 'Email',
      'password.forgot.email.or.username.tooltip': 'Email',
      'errors.E0000095': 'Unable to reset password.  Did you put in a valid email?'
    }
  }
});
 */

//<SecureRoute path='/' component= {Logout}/>