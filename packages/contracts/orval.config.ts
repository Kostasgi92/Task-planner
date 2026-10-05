import { defineConfig } from 'orval';

export default defineConfig({
  client: {
    input: './openapi.yaml',
    output: {
      target: './src/generated/client.ts',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      mode: 'single',
      baseUrl: '/api',
      override: {
        mutator: { path: './src/fetcher.ts', name: 'customFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  zod: {
    input: './openapi.yaml',
    output: {
      target: './src/generated/zod.ts',
      client: 'zod',
      mode: 'single',
      override: {
        zod: {
          coerce: { param: true, query: true },
          strict: { body: true },
        },
      },
    },
  },
});
