import { useEffect, useState } from 'react'
import 'talon-auth/login'
import { getLoginElement } from 'talon-auth'
import { createAutomerge, DocHandle } from 'talon-automerge'
import type { Doc } from 'talon-automerge'

import './App.css'
import { Chat } from './components/Chat'
import { UserSettings } from './components/UserSettings'
import { ChatDocument, CloudAuthUser, Message, User, sha256 } from './utils'
import loading from './assets/loading.svg'

const appId = import.meta.env.VITE_CLOUD_APP_ID as string

type AppDocumentHandle = DocHandle<ChatDocument>

const findWithRetry = async (
  automerge: ReturnType<typeof createAutomerge>,
  retries = 3,
  delay = 1000
): Promise<AppDocumentHandle> => {
  try {
    return await automerge.find<ChatDocument>()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (retries > 0 && message.includes('unavailable')) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return findWithRetry(automerge, retries - 1, delay * 2)
    }
    throw error
  }
}

function App() {
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [cloudAuthUser, setCloudAuthUser] = useState<CloudAuthUser>(null)
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [handle, setHandle] = useState<AppDocumentHandle | null>(null)

  const createUser = async (input: string) => {
    const username = input.trim().toLowerCase()
    const existingUser = users.find((u) => u.id === cloudAuthUser?.id)

    if (existingUser) {
      setUser(existingUser)
    } else if (users.find((u) => u.username === username)) {
      alert('Username already taken, please choose another one')
    } else if (handle && cloudAuthUser) {
      const emailHash = await sha256(cloudAuthUser.email || 'unknown')

      handle.change((doc) => {
        if (!doc.users) {
          doc.users = []
        }
        doc.users.push({
          id: cloudAuthUser.id,
          avatar: `https://www.gravatar.com/avatar/${emailHash}`,
          username
        })
      })
    }
  }

  const createMessage = (text: string) => {
    if (handle && user) {
      handle.change((doc) => {
        if (!doc.messages) {
          doc.messages = []
        }
        doc.messages.push({
          id: crypto.randomUUID(),
          text: text,
          createdAt: Date.now(),
          userId: user.id,
          likes: []
        })
      })
    }
  }

  const logout = async () => {
    const client = await getLoginElement()
    await client!.logoutAndForget()
    window.location.reload()
  }

  useEffect(() => {
    const init = async () => {
      const loadDocument = (doc?: Doc<ChatDocument>, currentUser?: CloudAuthUser) => {
        if (doc) {
          const id = currentUser?.id
          setUser(doc.users?.find((u) => u.id === id) || null)
          setMessages((doc.messages || []).slice(-20))
          setUsers(doc.users || [])
        }
        setReady(true)
      }

      const client = await getLoginElement()

      if (client === null) {
        throw new Error('Expected login element')
      }

      const automerge = createAutomerge(client)
      const currentCloudUser = await client.getUser()
      const currentHandle = await findWithRetry(automerge)

      setCloudAuthUser(currentCloudUser)
      setHandle(currentHandle)

      currentHandle.on('change', ({ doc }) => loadDocument(doc, currentCloudUser))

      if (currentHandle.isReady()) {
        loadDocument(await currentHandle.doc(), currentCloudUser)
      }
    }

    init()
  }, [])

  return (
    <main>
      <talon-login app-id={appId} />
      {ready ? (
        user === null ? (
          <UserSettings onSubmit={createUser} />
        ) : (
          handle && (
            <Chat
              messages={messages}
              user={user}
              users={users}
              createMessage={createMessage}
              handle={handle}
              onLogout={logout}
            />
          )
        )
      ) : (
        <img className="mx-auto mt-12" src={loading} alt="Loading" />
      )}
    </main>
  )
}

export default App
