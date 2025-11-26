
const swaggerUrl = process.env.REACT_APP_SWAGGERUI;

// AWS Cognito Configuration
// Matches the API configuration in agr_literature_service
const cognitoConfig = {
    Auth: {
        Cognito: {
            userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
            userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
            // Optional: Only needed if using OAuth/Hosted UI flows (social login, etc.)
            // If COGNITO_DOMAIN is not set, OAuth login will be disabled
            ...(process.env.REACT_APP_COGNITO_DOMAIN && {
                loginWith: {
                    oauth: {
                        domain: process.env.REACT_APP_COGNITO_DOMAIN,
                        scopes: ['openid', 'email', 'profile'],
                        redirectSignIn: [window.location.origin + '/'],
                        redirectSignOut: [window.location.origin + '/'],
                        responseType: 'code'
                    }
                }
            })
        }
    }
};

const swaggerUI = {
    url: swaggerUrl
};

export { cognitoConfig, swaggerUI };
