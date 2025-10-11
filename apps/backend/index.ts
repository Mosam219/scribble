import express from "express";
import type { Response, Request } from "express";

const app = express();
const port = 3001;

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Hello from the Bun backend!" });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
