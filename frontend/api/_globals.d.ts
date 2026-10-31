// Vercel injects env vars into `process.env` for both Node and Edge functions, but the
// Edge runtime doesn't otherwise match Node's global surface — so this declares only
// what's actually used here instead of pulling in all of @types/node.
declare const process: { env: Record<string, string | undefined> }
