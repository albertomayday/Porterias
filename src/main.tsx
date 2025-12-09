import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle GitHub Pages SPA redirect
const redirect = sessionStorage.getItem('gh-pages-redirect');
if (redirect) {
  sessionStorage.removeItem('gh-pages-redirect');
  window.history.replaceState(null, '', redirect);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
