# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Features

- Fully interactive four-player Spades table with animated bidding and trick play.
- Intelligent AI partners/opponents that follow suit, break spades, and evaluate bids.
- Scoreboard with bag tracking, round summaries, and automatic dealer rotation.
- Responsive, neon-inspired table layout built with vanilla TypeScript and modern DOM APIs.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies (Vite and TypeScript are already vendored in the lockfile):
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) if you use services that require it (not required for local play).
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the printed URL in your browser and start a new round.

## Quality Gate

Before committing changes, run:

```bash
npm run lint && npm test
```

This ensures TypeScript stays type-safe and the core Spades engine logic keeps behaving correctly.
