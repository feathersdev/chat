import { useState } from "react";
import { html } from "htm/react";

type CreateMessageOptions = {
  onSubmit: (text: string) => void;
};

export const CreateMessage = ({ onSubmit }: CreateMessageOptions) => {
  const [text, setText] = useState("");
  const handleSubmit = async () => {
    onSubmit(text);
    setText("");
  };

  return html`
    <form
      className="input-group overflow-hidden"
      id="send-message"
      onSubmit=${(ev: any) => {
        ev.preventDefault();
        handleSubmit();
      }}
    >
      <input
        name="text"
        type="text"
        value=${text}
        onChange=${(ev: any) => setText(ev.target.value)}
        placeholder="Compose message"
        className="input input-bordered w-full"
      />
      <button type="submit" className="btn">Send</button>
    </form>
  `;
};
