/**
 * Entry point backend StudyTrack untuk Cloudflare Workers.
 *
 * Menghubungkan Express app ke runtime Workers melalui httpServerHandler.
 */
import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";

import { createApp } from "./server.js";

const PORT = 3000;

const app = createApp(env);
app.listen(PORT);

export default httpServerHandler({ port: PORT });
