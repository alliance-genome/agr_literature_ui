const oktaAuthConfig = {
    // Note: If your app is configured to use the Implicit flow
    // instead of the Authorization Code with Proof of Code Key Exchange (PKCE)
    // you will need to add `pkce: false`
    issuer: 'https://alliancegenome.okta.com/oauth2/default',
    clientId: '0oa125a1rulKhwkiJ5d7',
    redirectUri: window.location.origin + '/login/callback',
    pkce: false
};


const oktaSignInConfig = {
    baseUrl: 'https://alliancegenome.okta.com',
    clientId: '0oa125a1rulKhwkiJ5d7',
    redirectUri: window.location.origin + '/login/callback',
    authParams: {
        pkce: false

    },
    // Additional documentation on config options can be found at https://github.com/okta/okta-signin-widget#basic-config-options
    idps:[
        {type: 'google', id: '0oa125kyaxyYZP0c35d7'},
        //{type: 'github', id:'0oa12b3n62hG7ZunB5d7', text: "Sign in with GitHub", className:'../GitHub-Mark.png'}
    ],
    idpDisplay: "SCONDARY"

};

const swaggerUI = {
    url:"http://dev.alliancegenome.org:11223/openapi.json"
}

export { oktaAuthConfig, oktaSignInConfig, swaggerUI };