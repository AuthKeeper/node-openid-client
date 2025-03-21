import * as client from 'openid-client'

// Prerequisites

let getCurrentUrl!: (...args: any) => URL
let server!: URL // Authorization server's Issuer Identifier URL
let clientId!: string
let clientSecret!: string
let clientPrivateKey!: client.CryptoKey | client.PrivateKey
/**
 * Value used in the authorization request as redirect_uri pre-registered at the
 * Authorization Server.
 */
let redirect_uri!: string

// End of prerequisites

let config = await client.discovery(server, clientId, clientSecret)

let code_challenge_method = 'S256'
/**
 * The following (code_verifier and potentially state) MUST be generated for
 * every redirect to the authorization_endpoint. You must store the
 * code_verifier and state in the end-user session such that it can be recovered
 * as the user gets redirected from the authorization server back to your
 * application.
 */
let code_verifier = client.randomPKCECodeVerifier()
let code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
let state!: string

{
  // redirect user to as.authorization_endpoint
  let parameters: Record<string, string> = {
    redirect_uri,
    scope: 'api:read',
    code_challenge,
    code_challenge_method,
  }

  /**
   * We cannot be sure the AS supports PKCE so we're going to use state too. Use
   * of PKCE is backwards compatible even if the AS doesn't support it which is
   * why we're using it regardless.
   */
  if (!config.serverMetadata().supportsPKCE()) {
    state = client.randomState()
    parameters.state = state
  }

  let redirectTo = await client.buildAuthorizationUrlWithJAR(
    config,
    parameters,
    clientPrivateKey,
  )

  console.log('redirecting to', redirectTo.href)
  // now redirect the user to redirectTo.href
}

// one eternity later, the user lands back on the redirect_uri
// Authorization Code Grant
let access_token: string
{
  let currentUrl: URL = getCurrentUrl()
  let tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: code_verifier,
    expectedState: state,
  })

  console.log('Token Endpoint Response', tokens)
  ;({ access_token } = tokens)
}

// Protected Resource Request
{
  let protectedResource = await client.fetchProtectedResource(
    config,
    access_token,
    new URL('https://rs.example.com/api'),
    'GET',
  )

  console.log('Protected Resource Response', await protectedResource.json())
}
