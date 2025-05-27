import { createAutomerge, DocHandle } from '@feathersdev/automerge'
import { auth } from './auth.js'
import type { ChatAppData } from './utils.js'

/**
 * The Feathers Automerge client. Use it to retrieve the document
 * for your application with `automerge.find()`.
 */
export const automerge = createAutomerge(auth)

/**
 * The document handle type for the application
 */
export type AppDocumentHandle = DocHandle<ChatAppData>

/**
 * Load the document for the application
 */
export async function loadAppDocument(): Promise<AppDocumentHandle> {
  return automerge.find<ChatAppData>()
}
