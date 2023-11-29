import { githubEventHandler } from '../lib/oauth/github'
import { googleEventHandler } from '../lib/oauth/google'
import { spotifyEventHandler } from '../lib/oauth/spotify'
import { twitchEventHandler } from '../lib/oauth/twitch'
import { auth0EventHandler } from '../lib/oauth/auth0'
import { microsoftEventHandler} from '../lib/oauth/microsoft'
import { discordEventHandler } from '../lib/oauth/discord'
import { battledotnetEventHandler } from '../lib/oauth/battledotnet'
import { linkedinEventHandler } from '../lib/oauth/linkedin'
import { oidcEventHandler } from '../lib/oauth/oidc'

export const oauth = {
  githubEventHandler,
  spotifyEventHandler,
  googleEventHandler,
  twitchEventHandler,
  auth0EventHandler,
  microsoftEventHandler,
  discordEventHandler,
  battledotnetEventHandler,
  linkedinEventHandler,
  oidcEventHandler
}
