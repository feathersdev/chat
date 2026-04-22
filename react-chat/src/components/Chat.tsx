import { DocHandle } from "talon-automerge";
import { ChatDocument, Message, User, cn } from "../utils";
import { CreateMessage } from "./CreateMessage"
import { MessageList } from "./MessageList"

export type ChatOptions = {
  user: User;
  users: User[];
  messages: Message[];
  createMessage: (text: string) => void;
  handle: DocHandle<ChatDocument>
  onLogout: () => void
};

export const Chat = ({ messages, user, users, createMessage, handle, onLogout }: ChatOptions) => {
  return <div className="drawer drawer-mobile"><input id="drawer-left" type="checkbox" className="drawer-toggle" />
    <div className="drawer-content flex flex-col">
      <div className="navbar w-full">
        <div className="navbar-start">
          <label htmlFor="drawer-left" className="btn btn-square btn-ghost lg:hidden drawer-button">
            <i className="i-feather-menu text-lg"></i>
          </label>
        </div>
        <div className="navbar-center flex flex-col">
          <p>Local-First Chat</p>
          <label htmlFor="drawer-right" className="text-xs cursor-pointer">
            <span className="online-count">{users.length}</span> User(s)
          </label>
        </div>
        <div className="navbar-end">
          <button className="btn btn-sm btn-neutral" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      <MessageList messages={messages} users={users} user={user} handle={handle} />
      <div className="form-control w-full py-2 px-3">
        <CreateMessage onSubmit={createMessage} />
      </div>
    </div>
    <div className="drawer-side overflow-y-auto overflow-x-none"><label htmlFor="drawer-left" className="drawer-overlay"></label>
      <ul className="menu user-list compact p-2 w-60 bg-base-300 text-base-content">
        <li className="menu-title"><span>Users</span></li>
        {users.map(current => <li className="user" key={current.id}>
          <a className={cn(user.id === current.id ? 'text-secondary font-bold' : '', 'no-underline')}>
            <div className="avatar indicator">
              <div className="w-6 rounded">
                <img src={current.avatar} alt={current.username!} />
              </div>
            </div>
            <span>{current.username}</span>
          </a>
        </li>)}
      </ul>
    </div>
  </div>
}
