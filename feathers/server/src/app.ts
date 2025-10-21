import { feathers } from 'feathers'

export type Message = {
  id: number
  text: string
  createdAt: number
}

class MessageService {
  public messages: Message[] = []

  async find() {
    return this.messages
  }

  async get(id: string) {
    const message = this.messages.find((message) => message.id === parseInt(id))
    if (!message) {
      throw new Error(`Message not found: ${id}`)
    }
    return message
  }

  async create({ text }: { text: string }) {
    const message: Message = {
      id: this.messages.length + 1,
      createdAt: Date.now(),
      text,
    }
    this.messages.push(message)
    return message
  }
}

export type Services = {
  messages: MessageService
}

const app = feathers<Services>()

app.use('messages', new MessageService())

app.service('messages').on('created', (message) => {
  console.log('Message created', message)
})

app.service('messages').create({
  text: 'Message from server',
})

export { app }
