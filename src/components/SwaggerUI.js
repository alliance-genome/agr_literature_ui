import styles from '../index.css';

import React from 'react';
// tslint:disable
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useSelector } from 'react-redux';
// tslint:able
import { swaggerUI } from '../config';

const SwaggerComp = params => {
    const accessToken = useSelector(state => state.isLogged.accessToken);

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
