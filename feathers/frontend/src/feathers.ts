import { AutomergeService } from '@kalisio/feathers-automerge'
import type { Services } from '../../server/src/app'
import { getDocument } from './automerge'
import { feathers } from 'feathers'
import { fetchClient } from 'feathers/client'

const client = feathers<Services>()

client.configure(
  fetchClient(window.fetch.bind(window), {
    baseUrl: 'http://localhost:3030',
  }),
)

// Use Automerge for the messages service. Comment out if you want to connect to the server instead.
client.use('messages', new AutomergeService(await getDocument()) as any)

export { client }
