// @ts-check
import fs from "fs"
import https from "https"
import http from "http"
import express from "express"
import { WebSocketServer } from "ws"
import { Repo } from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs"
import os from "os"

export class Server {
  /** @type WebSocketServer */
  #socket

  /** @type ReturnType<import("express").Express["listen"]> */
  #server

  /** @type {((value: any) => void)[]} */
  #readyResolvers = []

  #isReady = false

  constructor() {
    const dir = "automerge-sync-server-data"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    var hostname = os.hostname()

    this.#socket = new WebSocketServer({ noServer: true })

    const PORT =
      process.env.PORT !== undefined ? parseInt(process.env.PORT) : 3030

    const app = express()
    app.use(express.static("../svelte-chat/dist"))

    const config = {
      network: [new NodeWSServerAdapter(this.#socket)],
      storage: new NodeFSStorageAdapter(dir),
      /** @ts-ignore @type {(import("@automerge/automerge-repo").PeerId)}  */
      peerId: `storage-server-${hostname}`,
      // Since this is a server, we don't share generously — meaning we only sync documents they already
      // know about and can ask for by ID.
      sharePolicy: async () => false,
    }
    const serverRepo = new Repo(config)

    app.get("/", (req, res) => {
      res.send(`👍 @automerge/example-sync-server is running`)
    })

    app.get("/metrics", (req, res) => {
      res.json(serverRepo.metrics())
    })

    // Check if we should use HTTPS (certificates exist or FORCE_HTTPS is set)
    const certPath = process.env.CERT_PATH || '/etc/letsencrypt/live/dweb.feathers.dev';
    const privateKeyPath = `${certPath}/privkey.pem`;
    const certificatePath = `${certPath}/fullchain.pem`;
    
    const useHTTPS = process.env.FORCE_HTTPS === 'true' || 
      (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath));

    const onListen = () => {
      console.log(`${useHTTPS ? 'HTTPS' : 'HTTP'} Server listening on port ${PORT}`)
      this.#isReady = true
      this.#readyResolvers.forEach((resolve) => resolve(true))
    }

    if (useHTTPS) {
      const sslOptions = {
        key: fs.readFileSync(privateKeyPath),
        cert: fs.readFileSync(certificatePath),
      }
      this.#server = https.createServer(sslOptions, app).listen(PORT, onListen)
    } else {
      this.#server = http.createServer(app).listen(PORT, onListen)
    }

    this.#server.on("upgrade", (request, socket, head) => {
      this.#socket.handleUpgrade(request, socket, head, (socket) => {
        this.#socket.emit("connection", socket, request)
      })
    })
  }

  async ready() {
    if (this.#isReady) {
      return true
    }

    return new Promise((resolve) => {
      this.#readyResolvers.push(resolve)
    })
  }

  close() {
    this.#socket.close()
    this.#server.close()
  }
}

new Server()