/**
 * Entry point backend StudyTrack untuk Node.js lokal.
 *
 * Memuat `.env`, membuat Express app, lalu menjalankan listener HTTP.
 */
import "dotenv/config";

import { createApp } from "./server.js";

const port = process.env.PORT || 4000;
const app = createApp(process.env);

app.listen(port, () => {
  console.log(`StudyTrack backend berjalan di http://localhost:${port}`);
});
