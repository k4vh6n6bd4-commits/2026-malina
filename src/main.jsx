import React from "react";
import ReactDOM from "react-dom/client";
import App,{AppErrorBoundary} from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration=await navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"});
      registration.update();
    } catch (error) {
      console.warn("PWA шинэчлэл шалгаж чадсангүй",error);
    }
  });
}
