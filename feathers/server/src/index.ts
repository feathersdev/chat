import { createServerAdapter } from '@whatwg-node/server'
import { createHandler } from 'feathers/http'
import { createServer } from 'node:http'
import { app } from './app.ts'

const handler = createHandler(app)
const nodeServer = createServer(createServerAdapter(handler))

app.on('connection', (connection) => app.channel('everyone').join(connection))
app.publish(() => app.channel('everyone'))

nodeServer.listen(process.env.PORT || 3030, async () => {
  await app.setup(nodeServer)
  console.log(`Feathers server listening on port ${process.env.PORT || 3030}`)
})
