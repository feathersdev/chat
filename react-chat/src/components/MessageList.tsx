import { useEffect, useRef } from "react"
import { ChatDocument, Message, User } from "../utils"
import { DocHandle } from "@automerge/automerge-repo"
import { marked, type Tokens} from 'marked';
import DOMPurify from 'dompurify';

marked.use({
  renderer: {
    /* This is basically what marked is doing, just inlined */
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens);

      let cleanHref

      try {
        cleanHref = encodeURI(href).replace(/%25/g, '%');
      } catch {
        cleanHref = null
      }

      if (cleanHref === null) {
        return text;
      }

      let out = '<a target="_blank" rel="noopener noreferrer" href="' + cleanHref + '"';

      if (title) {
        out += ' title="' + title + '"';
      }

      out += '>' + text + '</a>';

      return out;
    }

  }
})

type MessageListProps = {
  messages: Message[]
  users: User[]
  user: User
  handle: DocHandle<ChatDocument>
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
    dateStyle: 'medium'
  }).format(new Date(timestamp))

export const MessageList = ({ messages, users, user, handle }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const usersById = users.reduce((acc, user) => {
    acc[user.id] = user
    return acc
  }, {} as Record<string, User>)

  function getLikeCount(message: Message) {
    return message.likes?.length || 0;
  }

  // Update the message's Like
  const createLike = (messageId: string) => {
    if (handle && user) {
      handle.change(doc => {
        const msg = doc.messages.find(message => message.id === messageId);
        if (msg) {
          const likeArray = msg.likes || [];
          // check to see if the user has already liked this message
          if (likeArray.includes(user.id)) {
            // Remove the like if the user has already liked the message
            msg.likes = likeArray.filter(like => like !== user.id)
          } else {
            // Add the user to the array of users who have liked this message
            msg.likes = likeArray.concat(user.id);
          }
        }
      })
    }
  }

  useEffect(() => {
    (messagesEndRef.current)?.scrollIntoView({ behavior: "auto" })
  }, [])

  return <div id="chat" className="h-full overflow-y-auto px-3">
    {messages.map(message => <div className="chat chat-start py-2" key={message.id}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img src={usersById[message.userId]?.avatar} />
        </div>
      </div>
      <div className="chat-header pb-1 space-x-2">
        <span>{usersById[message.userId]?.username}</span>
        <time className="text-xs opacity-50">{formatDate(message.createdAt)}</time>
      </div>
      <div className="chat-bubble break-words"
        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(marked.parse(message.text, { async: false }), { ADD_ATTR: ['target'] })}} />
      <div className="chat-footer">
        {/* Swap icons based on whether users have liked it or not */}
        <span className="text-xs cursor-pointer" onClick={() => createLike(message.id)}>
          {getLikeCount(message) > 0
            ? <span>❤️ {getLikeCount(message)} Like{getLikeCount(message) > 1 ? 's' : ''}</span>
            : '🤍'}
        </span>
       </div>
    </div>)}
    <div ref={messagesEndRef} />
  </div>
}
