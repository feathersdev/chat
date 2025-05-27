import { createClient } from '@feathersdev/auth'

/**
 * This is your public application id
 */
export const appId = import.meta.env.VITE_CLOUD_APP_ID as string

/**
 * The Feathers auth client instance. You can use it to get a token,
 * retrieve the current user and to log in and out.
 */
export const auth = createClient({
  appId,
  onLoginRequired: async (error) => {
    // Redirect to login page if a login is required
    // You can also do other things here like show a modal before redirecting
    window.location.href = await auth.getLoginUrl(error)
  },
})

/**
 * Make an authenticated request to a server using the standard fetch API.
 * Will redirect to the login page instead if the user needs to log in.
 *
 * @param url The URL for the request
 * @param options Additional request options.
 * @returns The fetch response
 */
export async function authFetch(url: string, options?: RequestInit) {
  const headers = new Headers(options?.headers)

  // Set the authorization header with the Feathers Auth token
  headers.set('Authorization', await auth.getHeader())

  return fetch(url, {
    ...options,
    headers,
  })
}
