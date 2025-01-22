import { useEffect, useRef } from "react";
import type { Message, User } from "../utils.ts";
import { html } from "htm/react";

type MessageListProps = {
  messages: Message[];
  users: User[];
};

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    dateStyle: "medium",
  }).format(new Date(timestamp));

export const MessageList = ({ messages, users }: MessageListProps) => {
  const messagesEndRef = useRef(null);
  const usersById = users.reduce(
    (acc, user) => {
      acc[user.id] = user;
      return acc;
    },
    {} as Record<string, User>
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    (messagesEndRef.current as any)?.scrollIntoView({ behavior: "smooth" });
  });

  return html`
    <div id="chat" className="h-full overflow-y-auto px-3">
      ${messages.map(
        (message) => html`
          <div className="chat chat-start py-2" key=${message.id}>
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <img src=${usersById[message.userId]?.avatar} />
              </div>
            </div>
            <div className="chat-header pb-1">
              ${usersById[message.userId]?.username}
              <time className="text-xs opacity-50"
                >${formatDate(message.createdAt)}</time
              >
            </div>
            <div className="chat-bubble">${message.text}</div>
          </div>
        `
      )}
      <div ref=${messagesEndRef} />
    </div>
  `;
};
