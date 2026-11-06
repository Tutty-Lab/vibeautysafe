import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store.jsx";
import App from "./App.jsx";
import "./index.css";

// Follow the system light/dark setting
const mq = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.classList.toggle("dark", mq.matches);
applyTheme();
mq.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);
