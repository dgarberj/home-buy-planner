import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ui";
import { initI18n } from "./i18n";
import "./index.css";

initI18n();

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
