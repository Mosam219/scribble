import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./app.css";
import Layout from "./layout/layout";
import Home from "./pages/home/home";

const router = createBrowserRouter([
  {
    path: "/:roomId?",
    element: <Home />,
  },
]);

function App() {
  return (
    <Layout>
      <RouterProvider router={router} />
    </Layout>
  );
}

export default App;
