import { createElement, StrictMode } from "react";
import ReactDOM, { type Container } from "react-dom/client";
import App from "./App.ts";
import { html } from "htm/react";

import indexStyle from "./index.css" with { type: "css" };
import daisyUiStyle from "https://cdn.jsdelivr.net/npm/daisyui@2.46.1/dist/full.css" with { type: "css" };
import tailwindStyle from "https://cdn.jsdelivr.net/npm/tailwindcss@2.2/dist/tailwind.min.css" with { type: "css" };

throw new Error('test');

document.adoptedStyleSheets.push(indexStyle);
document.adoptedStyleSheets.push(daisyUiStyle);
document.adoptedStyleSheets.push(tailwindStyle);

ReactDOM.createRoot(document.getElementById("root") as Container).render(html`
  <${StrictMode}>
    <link rel="stylesheet" href="https://dove.feathersjs.com/feathers-chat.css" />
    <${App} />
  </${StrictMode}>
`);
