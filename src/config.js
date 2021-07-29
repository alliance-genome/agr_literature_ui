
const oktaDomain = process.env.REACT_APP_OKTADOMAIN;
const clientId = process.env.REACT_APP_CLIENTID;
const issuer = 'https://' + oktaDomain +'/oauth2/default';
const baseUrl = 'https://' + oktaDomain;
const swaggerUrl = process.env.REACT_APP_SWAGGERUI;
const googleId = process.env.REACT_APP_GOOGLEID;

const oktaAuthConfig = {
    // Note: If your app is configured to use the Implicit flow
    // instead of the Authorization Code with Proof of Code Key Exchange (PKCE)
    // you will need to add `pkce: false`
    issuer: issuer,
    clientId: clientId,
    redirectUri: window.location.origin + '/login/callback',
    pkce: true,
};


const oktaSignInConfig = {
    baseUrl: baseUrl,
    clientId: clientId,
    redirectUri: window.location.origin + '/login/callback',
    authParams: {
        pkce: true

    },
    // Additional documentation on config options can be found at https://github.com/okta/okta-signin-widget#basic-config-options
    idps:[
        {type: 'google', id: googleId},
        //{type: 'github', id:'0oa12b3n62hG7ZunB5d7', text: "Sign in with GitHub", className:'../GitHub-Mark.png'}
    ],
    idpDisplay: "SCONDARY"

};

const swaggerUI = {

    url:swaggerUrl
}
export { oktaAuthConfig, oktaSignInConfig, swaggerUI };



