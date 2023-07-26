import "./styles.scss";
import "./theme.css";
import App from "./App.svelte";
import { addAPIProvider, _api } from "iconify-icon";

addAPIProvider("", {
  resources: ["http://localhost:3000/api"],
});

const app = new App({
  target: document.getElementById("app")
});

export default app;
