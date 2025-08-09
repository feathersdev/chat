<script lang="ts">
  import QRCode from 'qrcode';
  import {
    type AnyDocumentId,
    Repo,
    type Doc
  } from '@automerge/automerge-repo';
  import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
  import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

  import {
    LoginRequiredError,
    createClient,
    createVerifier
  } from '@featherscloud/auth';

  import type { ChatDocument, CloudAuthUser, Message, User } from './utils.js';
  import { formatDate, sha256 } from './utils.js';
  import { afterUpdate } from 'svelte';

  // Initialize Feathers Cloud Auth
  const appId = import.meta.env.VITE_CLOUD_APP_ID as string;
  const auth = createClient({ appId });
  const verifier = createVerifier({ appId });

  // Initialize Automerge
  const automergeUrl = import.meta.env.VITE_AUTOMERGE_URL || 'wss://dweb.feathers.cloud';
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter(automergeUrl)],
    storage: new IndexedDBStorageAdapter()
  });
  // const automergeUrl = repo.create<ChatDocument>({
  //   users: [],
  //   messages: []
  // });
  // const handle = repo.find<ChatDocument>(automergeUrl);
  function getHandle() {
    if (window.location.hash) {
      return repo.find<ChatDocument>((window.location as any).hash.slice(1));
    } else {
      const newRepo = repo.create<ChatDocument>({
        users: [],
        messages: []
      });
      window.location.hash = newRepo.url;
      return newRepo
    }
  }

  const handle = getHandle()
  
  let ready = false;
  let cloudAuthUser: CloudAuthUser | null = null;
  let user: User | null = null;
  let messages: Message[] = [];
  let users: User[] = [];
  let text: string = '';

  const getUserById = (id: string) => users.find((user) => user.id === id);

  const init = async () => {
    try {
      // Get Feathers Cloud Auth access token
      // const accessToken = await auth.getAccessToken();
      const device = await auth.getDevice()
      cloudAuthUser = { id: device.deviceId };

      // Verify our token (this will redirect to the login screen if necessary)
      const loadDocument = (doc?: Doc<ChatDocument>) => {
        if (doc) {
          user =
            doc.users.find((user) => user.id === cloudAuthUser?.id) || null;
          messages = doc.messages;
          users = doc.users;
        }
        ready = true;
      };

      // Update application data when document changes
      handle.on('change', ({ doc }) => loadDocument(doc));
      // Initialise the document if it is already available
      if (handle.isReady()) {
        loadDocument(await handle.doc());
      }
    } catch (error) {
      // Redirect to Feathers Cloud Auth login
      if (error instanceof LoginRequiredError) {
        window.location.href = await auth.getLoginUrl(error);
      }
      throw error;
    }
  };

  // Sets the current user's username and stores it in the document
  const createUser = async (ev: Event) => {
    const formElement = ev.target as HTMLFormElement;
    const input: string = formElement.username.value;
    const username = input.trim().toLowerCase();
    const existingUser = users.find((user) => user.id === cloudAuthUser?.id);

    ev.preventDefault();

    if (existingUser) {
      user = existingUser;
    } else if (users.find((user) => user.username === username)) {
      alert('Username already taken, please choose another one');
    } else {
      const emailHash = await sha256(cloudAuthUser?.email || username || 'unknown');

      handle.change((doc) => {
        if (cloudAuthUser !== null) {
          doc.users.push({
            id: cloudAuthUser.id,
            avatar: `https://www.gravatar.com/avatar/${emailHash}`,
            username: username.split('@')[0]
          });
        }
      });
    }
  };

  const createMessage = (ev: Event) => {
    ev.preventDefault();

    handle.change((doc) => {
      if (user !== null) {
        doc.messages.push({
          id: crypto.randomUUID(),
          text: text,
          createdAt: Date.now(),
          userId: user.id
        });
        text = '';
      }
    });
  };

  let hasQr = false;

  function generateQR() {
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, window.location.href, function (error: any) {
      if (error) {
        console.error('error generating qr', error);
      } else {
        const base64String = canvas.toDataURL('image/png').split(',')[1];
        const qr: any = document.getElementById('qr');
        qr.src = `data:image/png;base64,${base64String}`;
        hasQr = true;
      }
    });
  }

  afterUpdate(() => {
    document
      .getElementById('message-end')
      ?.scrollIntoView({ behavior: 'smooth' });
    
    if (!hasQr) {
      generateQR();
    }
  });

  let isModalOpen = false;
  let modalElement: any;

  function openModal() {
    isModalOpen = true;
    modalElement?.isModalOpen();
  }

  function closeModal() {
    isModalOpen = false;
    modalElement?.close();
  }

  init();
</script>

<main>
  
  {#if ready}
    {#if user === null}
    

      <div
        class="login flex min-h-screen bg-neutral justify-center items-center"
      >
        <div class="card w-full max-w-sm bg-base-100 px-4 py-8 shadow-xl">
          <div class="px-4">
            <h1
              class="text-3xl font-bold text-center my-5 bg-clip-text bg-gradient-to-br"
            >
              Enter your email or username
            </h1>
          </div>
          <form class="card-body pt-2" on:submit={createUser}>
            <div class="form-control">
              <label for="username" class="label">
                <span class="label-text">Your email or username</span>
              </label>
              <input type="text" name="username" class="input input-bordered" />
            </div>
            <div class="form-control mt-6">
              <button id="login" type="submit" class="btn">Start chatting</button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    {#if user !== null}
      <div class="drawer drawer-mobile">
        <input id="drawer-left" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex flex-col">
          <div class="navbar w-full">
            <div class="navbar-start">
              <label
                for="drawer-left"
                class="btn btn-square btn-ghost lg:hidden drawer-button"
              >
                <i class="i-feather-menu text-lg"></i>
              </label>
            </div>
            <div class="navbar-center flex flex-col">
              <p>Local-First Chat</p>
              <label for="drawer-right" class="text-xs cursor-pointer">
                <span class="online-count">{users.length}</span> User(s)
              </label>
            </div>
            <div class="navbar-end">
              <!-- Show QR Code button -->
              <button class="btn btn-circle" on:click={openModal}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M3 11V3h8v8zm2-2h4V5H5zM3 21v-8h8v8zm2-2h4v-4H5zm8-8V3h8v8zm2-2h4V5h-4zm4 12v-2h2v2zm-6-6v-2h2v2zm2 2v-2h2v2zm-2 2v-2h2v2zm2 2v-2h2v2zm2-2v-2h2v2zm0-4v-2h2v2zm2 2v-2h2v2z"/>
                </svg>
              </button>
            </div>
          </div>
          <div id="chat" class="h-full overflow-y-auto px-3">
            {#each messages as message (message.id)}
              <div class="chat chat-start py-2">
                <div class="chat-image avatar">
                  <div class="w-10 rounded-full">
                    <img
                      src={getUserById(message.userId)?.avatar}
                      alt={getUserById(message.userId)?.username}
                    />
                  </div>
                </div>
                <div class="chat-header pb-1">
                  {getUserById(message.userId)?.username}
                  <time class="text-xs opacity-50"
                    >{formatDate(message.createdAt)}</time
                  >
                </div>
                <div class="chat-bubble">{message.text}</div>
              </div>
            {/each}
            <div id="message-end" />
          </div>
          <div class="form-control w-full py-2 px-3">
            <form
              class="input-group overflow-hidden"
              id="send-message"
              on:submit={createMessage}
            >
              <input
                name="text"
                type="text"
                placeholder="Compose message"
                class="input input-bordered w-full"
                bind:value={text}
              />
              <button type="submit" class="btn">Send</button>
            </form>
          </div>
        </div>
        <div class="drawer-side">
          <label for="drawer-left" class="drawer-overlay"></label>
          <div class="flex flex-col h-full bg-base-300 justify-between w-11/12 border-r border-base-100">
            <div class="flex flex-col p-2 overflow-y-auto w-60 text-base-content w-full">
              <ul class="menu user-list compact py-2 overflow-y-auto w-60 text-base-content">
                <li class="menu-title"><span>Users</span></li>
                {#each users as current (current.id)}
                <li class="user">
                  <a
                  href="#"
                  class={user.id === current.id
                        ? 'text-secondary font-bold'
                        : ''}
                    >
                    <div class="avatar indicator">
                      <div class="w-6 rounded">
                        <img src={current.avatar} alt={current.username} />
                      </div>
                    </div>
                    <span>{current.username}</span>
                  </a>
                </li>
                {/each}
              </ul>
            </div>
            
            <div class="m-4">
              <a href="/" target="_blank" type="button" class="btn btn-accent btn-block">New Chat</a>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Modal -->
  <dialog bind:this={modalElement} class="modal w-screen h-screen" class:modal-open={isModalOpen}>
    <div class="modal-box text-center pt-12">
      <h3 class="text-xl font-bold">Share DWeb Chat!</h3>
      <p class="py-4 text-center">Scan or share this QR code to join the chat.</p>
      <div class="flex items-center justify-center">
        <img id="qr" alt="use this qr code to share or join the chat" />
      </div>
      <div class="modal-action">
        <button class="btn" on:click={closeModal}>Close</button>
      </div>
    </div>
  </dialog>
</main>
