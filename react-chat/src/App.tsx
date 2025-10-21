import { useEffect, useState } from 'react'
import { AnyDocumentId, DocHandle, Repo } from '@automerge/automerge-repo';
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

import './App.css'
import { Chat } from './components/Chat'
import { UserSettings } from './components/UserSettings'
import { LoginRequiredError, createClient, createVerifier } from '@featherscloud/auth'
import { ChatDocument, CloudAuthUser, Message, User, sha256 } from './utils';

// Initialize Feathers Cloud Auth
const appId = import.meta.env.VITE_CLOUD_APP_ID as string;
const auth = createClient({ appId });
const verifier = createVerifier({ appId });

// Initialize Automerge
const repo = new Repo({
  network: [ new BrowserWebSocketClientAdapter('wss://sync.automerge.org') ],
  storage: new IndexedDBStorageAdapter()
});
const automergeUrl = import.meta.env.VITE_AUTOMERGE_URL as AnyDocumentId;

function App() {
  // Keep references to message list, current user and Automerge handle
  const [messages, setMessages] = useState<Message[]>([])
  const [cloudAuthUser, setCloudAuthUser] = useState<CloudAuthUser | null>(null)
  const [user, setUser] = useState<User|null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [handle, setHandle] = useState<DocHandle<ChatDocument> | null>(null)

  // Sets the current user's username and stores it in the document
  const createUser = async (input: string) => {
    const username = input.trim().toLowerCase()

    if (users.find(user => user.username === username)) {
      alert('Username already taken, please choose another one')
    } else if (handle && cloudAuthUser) {
      const emailHash = await sha256(cloudAuthUser?.email || 'unknown');

      handle.change(doc => {
        doc.users.push({
          id: cloudAuthUser.id,
          avatar: `https://www.gravatar.com/avatar/${emailHash}`,
          username
        })
      })
    }
  }

  // Create a new Message
  const createMessage = (text: string) => {
    if (handle && user) {
      handle.change(doc => {
        doc.messages.push({
          id: crypto.randomUUID(),
          text: text,
          createdAt: Date.now(),
          userId: user.id,
          likes:[]
        })
      })
    }
  }

  // Initialize the application
  const init = async () => {
    try {
      // Get Feathers Cloud Auth access token
      const accessToken = await auth.getAccessToken();
      // Verify our token (this will redirect to the login screen if necessary)
      const { user: cloudAuthUser } = await verifier.verify(accessToken)
      const currentHandle = repo.find<ChatDocument>(automergeUrl)

      // Update application data when document changes
      currentHandle.on('change', ({doc}) => {
        const existingUser = doc.users.find(user => user.id === cloudAuthUser?.id) || null

        setUser(existingUser)
        setMessages((doc.messages || []).slice(-20))
        setUsers(doc.users)
      })

      setCloudAuthUser(cloudAuthUser)
      setHandle(currentHandle)
    } catch (error) {
      // Redirect to Feathers Cloud Auth login
      if (error instanceof LoginRequiredError) {
        window.location.href = await auth.getLoginUrl(error)
      }
      throw error;
    }
  }

  useEffect(() => {
    init()
  }, [])

  if (handle?.isReady()) {
    return user === null
      ? <UserSettings onSubmit={createUser} />
      : <Chat messages={messages} user={user} users={users} createMessage={createMessage} handle={handle} />
  }
}

export default App
