import styles from '../index.css';

import React, {useEffect} from 'react';
// tslint:disable
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import {useOktaAuth} from "@okta/okta-react";
// tslint:able
import { swaggerUI } from '../config';

const SwaggerComp = params => {
    const { authState, oktaAuth } = useOktaAuth();
    let accessToken = null

    //const accessToken = authState.accessToken.accessToken

    useEffect(() => {

        if (!authState.isAuthenticated) {
            // When user isn't authenticated, forget any user info
            accessToken = null;
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

    return (
        <div className={styles.wrapper}>
            <SwaggerUI
                url={swaggerUI.url}
                requestInterceptor={requestInterceptor}
            />
        </div>
    )
};

export default SwaggerComp;
