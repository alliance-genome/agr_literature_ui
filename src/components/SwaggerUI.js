import styles from '../index.css';

import React, {useEffect} from 'react';
// tslint:disable
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import {useOktaAuth} from "@okta/okta-react";
import {signIn, signOut} from "../actions";
import {isAccessToken} from "@okta/okta-auth-js";
// tslint:able

const SwaggerComp = params => {
    const { authState, oktaAuth } = useOktaAuth();
    console.log(authState)

    //const accessToken = authState.accessToken.accessToken
    let accessToken = null
    useEffect(() => {
        if (!authState.isAuthenticated) {
            // When user isn't authenticated, forget any user info
            accessToken = null
        } else {
            accessToken = authState.accessToken.accessToken

        }
    }, [authState, oktaAuth]);






    const requestInterceptor = (req) => (
        {
            ...req,
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );
    console.log(requestInterceptor)
    return (
        <div className={styles.wrapper}>
            <SwaggerUI
                url="http://dev.alliancegenome.org:49141/openapi.json"
                requestInterceptor={requestInterceptor}
            />
        </div>
    )
};

export default SwaggerComp;