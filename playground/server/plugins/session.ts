export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session) => {
    // Extend User Session
    // Or throw createError({ ... }) if session is invalid
    session.extended = {
      fromHooks: true
    }
  })

  sessionHooks.hook('clear', async (session) => {
    // Log that user logged out
    console.log('User logged out')
  })
})

