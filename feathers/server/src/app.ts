import { feathers } from 'feathers'

export type Message = {
  id: number
  text: string
  createdAt: number
}

export class MessageService {
  messages: Message[] = []

  async find() {
    return this.messages
  }

  async get(id: string) {
    const message = this.messages.find((message) => message.id === parseInt(id))

    if (!message) {
      throw new Error(`Message not found`)
    }

    return message
  }

  async create(data: Pick<Message, 'text'>) {
    const message = {
      id: this.messages.length,
      text: data.text,
      createdAt: Date.now(),
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

app.service('messages').on('created', (message: Message) => {
  console.log(`Message created: ${message.text}`)
})

app.service('messages').create({
  text: 'Hello from server',
})

export { app }
