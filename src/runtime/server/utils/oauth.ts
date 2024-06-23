import { githubEventHandler } from '../lib/oauth/github'
import { googleEventHandler } from '../lib/oauth/google'
import { spotifyEventHandler } from '../lib/oauth/spotify'
import { twitchEventHandler } from '../lib/oauth/twitch'
import { auth0EventHandler } from '../lib/oauth/auth0'
import { microsoftEventHandler } from '../lib/oauth/microsoft'
import { discordEventHandler } from '../lib/oauth/discord'
import { battledotnetEventHandler } from '../lib/oauth/battledotnet'
import { keycloakEventHandler } from '../lib/oauth/keycloak'
import { linkedinEventHandler } from '../lib/oauth/linkedin'
import { cognitoEventHandler } from '../lib/oauth/cognito'
import { facebookEventHandler } from '../lib/oauth/facebook'
import { paypalEventHandler } from '../lib/oauth/paypal'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  googleEventHandler,
  twitchEventHandler,
  auth0EventHandler,
  microsoftEventHandler,
  discordEventHandler,
  battledotnetEventHandler,
  keycloakEventHandler,
  linkedinEventHandler,
  cognitoEventHandler,
  facebookEventHandler,
  paypalEventHandler,
}
