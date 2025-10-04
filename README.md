# nasa-meteor-bears
Island Polar Bears NASA Space Apps Hackathon

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), featuring:
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ESLint** for code quality
- Interactive visualization tools for meteor data
- 3D orbital paths (Three.js) and 2D impact maps (D3.js)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
src/
├── app/              # Next.js app directory (pages, layouts, routing)
├── api/              # API client and utilities
│   └── index.ts      # Fetch wrapper with error handling and fallbacks
├── lib/              # Shared library utilities and helper functions
│   └── index.ts      # Library exports
├── logger/           # Centralized logging utilities
│   └── index.ts      # Logger implementation with different log levels
└── utils/            # Utility functions for data processing
    └── index.ts      # Utility exports
```

### Key Features

- **Error Handling**: The `api/` folder includes robust error handling and fallbacks for API failures
- **Logging**: Centralized logging system in `logger/` for debugging and monitoring
- **TypeScript**: Full type safety across the project
- **Path Aliases**: Use `@/` to import from src directory (e.g., `import { logger } from '@/logger'`)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
