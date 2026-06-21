// Vercel serverless entry point.
// Vercel invokes this default export as the handler for every request
// (see backend/vercel.json rewrites). The Express app is a valid
// (req, res) handler, and the DB connection is established lazily and
// cached inside the app middleware (see src/app.ts + src/config/database.ts).
import app from "../src/app";

export default app;
