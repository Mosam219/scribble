import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./app.css";
import { SocketServiceProvider } from "./contexts/socketServiceContext";
import Layout from "./layout/layout";
import Game from "./pages/game/game";
import Home from "./pages/home/home";

const router = createBrowserRouter([
  {
    path: "/:roomId/game",
    element: <Game />,
  },
  {
    path: "/:roomId?",
    element: <Home />,
  },
]);

function App() {
  return (
    <SocketServiceProvider>
      <Layout>
        <RouterProvider router={router} />
      </Layout>
    </SocketServiceProvider>
  );
}

export default App;
