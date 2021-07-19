const oktaAuthConfig = {
    // Note: If your app is configured to use the Implicit flow
    // instead of the Authorization Code with Proof of Code Key Exchange (PKCE)
    // you will need to add `pkce: false`
    issuer: 'https://alliancegenome.okta.com/oauth2/default',
    //clientId: '0oatzysrlMv0TSzDl5d6',
    clientId: '0oa125a1rulKhwkiJ5d7',
    //clientSecret: "SSSbCoKo2MdxDaNXk52y9Fhs0yvO-pLVNtSm0l4s",
    redirectUri: window.location.origin + '/login/callback',
    //responseType: 'code',
    pkce: true
};


const oktaSignInConfig = {
    baseUrl: 'https://alliancegenome.okta.com',
    //clientId: '0oatzysrlMv0TSzDl5d6',
    clientId: '0oa125a1rulKhwkiJ5d7',
    //clientSecret: "SSSbCoKo2MdxDaNXk52y9Fhs0yvO-pLVNtSm0l4s",
    redirectUri: window.location.origin + '/login/callback',
    authParams: {
        pkce: true,
        //clientSecret: "SSSbCoKo2MdxDaNXk52y9Fhs0yvO-pLVNtSm0l4s",
        //responseType: 'code',
        //issuer: 'https://morgan-harvard.okta.com/oauth2/default',
        //responseType: ['token', 'id_token'],
    },
    // Additional documentation on config options can be found at https://github.com/okta/okta-signin-widget#basic-config-options
    idps:[
        {type: 'google', id: '0oa125kyaxyYZP0c35d7'},
        {type: 'github', id:'0oa12b3n62hG7ZunB5d7', text: "Sign in with GitHub", className:'../GitHub-Mark.png'}],
    idpDisplay: "SCONDARY"

};

//const idps = {idps:[
//    {type: 'google', id: '0oa125kyaxyYZP0c35d7'}
//]};
//const idpDisplay ={idpDisplay: "PRIMARY"};



export { oktaAuthConfig, oktaSignInConfig };