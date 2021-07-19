import React, {useEffect, useRef, useState} from 'react';
import OktaSignIn from '@okta/okta-signin-widget';
import '@okta/okta-signin-widget/dist/css/okta-sign-in.min.css';
import { ReactDOM } from 'react-dom';


const OktaSignInWidget = ({ config, onSuccess, onError }) => {

    const widgetRef = useRef();
    useEffect(() => {
        if (!widgetRef.current)
            return false;

        const widget = new OktaSignIn(config);

        widget.showSignInToGetTokens({
            el: widgetRef.current,
        }).then(onSuccess).catch(onError);

        return () => widget.remove();
    }, [config, onSuccess, onError]);

    return (<div ref={widgetRef}  /> );
    //return ReactDOM.createPortal(<div ref={widgetRef}  /> , document.body)
};
export default OktaSignInWidget;

/*
const accessToken = authState.accessToken;

const response = await fetch(url, {
    headers: {
        Authorization: `Bearer ${accessToken}`,
    },
}); */
