<script lang="ts">
  import type { Message } from '../../server/src/app'
  import { client } from './feathers'

  let text = $state('')
  let messages = $state(await client.service('messages').find())

  client.service('messages').on('created', (message: Message) => {
    messages.push(message)
  })

  await client.setup()

  function createMessage(event: Event) {
    event.preventDefault()
    client.service('messages').create({
      text,
    })
    text = ''
  }
</script>

<main>
  <div class="drawer drawer-mobile">
    <input id="drawer-left" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex flex-col">
      <div id="chat" class="h-full overflow-y-auto px-3">
        {#each messages as message (message.id)}
          <div class={`chat py-2 chat-start`}>
            <div class="chat-image avatar">
              <div class="w-10 rounded-full">
                <img src="https://github.com/feathersdev.png" />
              </div>
            </div>
            <div class="chat-header pb-1">
              <time class="text-xs opacity-50">{new Date(message.createdAt).toLocaleString()}</time>
            </div>
            <div class="chat-bubble">
              {message.text}
            </div>
          </div>
        {/each}
        <div id="message-end" />
      </div>
      <div class="form-control w-full py-2 px-3">
        <form class="input-group overflow-hidden" id="send-message" on:submit={createMessage}>
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
  </div>
</main>
