import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import App from "./App";
import Today from "./pages/Today";
import Tasks from "./pages/Tasks";
import Shop from "./pages/Shop";
import Status from "./pages/Status";
import Story from "./pages/Story";
import Auth from "./pages/Auth";
import Achievements from "./pages/Achievements";
import Settings from "./pages/Settings";
import { ToastProvider } from "./components/ui/ToastProvider";
import { registerServiceWorker } from "./registerSW";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Today /> },
      { path: "tasks", element: <Tasks /> },
      { path: "status", element: <Status /> },
      { path: "story", element: <Story /> },
      { path: "shop", element: <Shop /> },
      { path: "achievements", element: <Achievements /> },
      { path: "settings", element: <Settings /> },
      { path: "auth", element: <Auth /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

registerServiceWorker();
