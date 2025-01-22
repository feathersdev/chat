import { type FormEvent } from "react";
import { html } from "htm/react";

type UserSettingsProps = { onSubmit: (username: string) => void };

export const UserSettings = ({ onSubmit }: UserSettingsProps) => {
  const saveUsername = (ev: FormEvent) => {
    const username = (ev.target as HTMLFormElement).username.value;
    onSubmit(username);
    ev.preventDefault();
  };

  return html`
    <div
      className="login flex min-h-screen bg-neutral justify-center items-center"
    >
      <div className="card w-full max-w-sm bg-base-100 px-4 py-8 shadow-xl">
        <div className="px-4">
          <h1
            className="text-3xl font-bold text-center my-5 bg-clip-text bg-gradient-to-br"
          >
            Pick a username
          </h1>
        </div>
        <form className="card-body pt-2" onSubmit=${saveUsername}>
          <div className="form-control">
            <label htmlFor="username" className="label">
              <span className="label-text">Your username</span>
            </label>
            <input
              type="text"
              name="username"
              className="input input-bordered"
            />
          </div>
          <div className="form-control mt-6">
            <button id="login" type="submit" className="btn">
              Start chatting
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
};
