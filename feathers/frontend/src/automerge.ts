import { Repo, type AnyDocumentId } from '@automerge/automerge-repo'
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket'
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb'
import type { SyncServiceDocument } from '@kalisio/feathers-automerge'

export const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter('wss://sync.automerge.org')],
  storage: new IndexedDBStorageAdapter(),
})

export async function getDocument() {
  const hash = window.location.hash

  if (hash) {
    const url = hash.substring(1)
    return repo.find<SyncServiceDocument>(url as AnyDocumentId)
  }

  const doc = repo.create<SyncServiceDocument>({
    __meta: {},
    data: {},
  })

  window.location.hash = doc.url

  return doc
}
