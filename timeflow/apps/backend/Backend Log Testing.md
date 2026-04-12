# Render Backend Logs
**Status:** 🟢 LIVE  |  **Commit:** `5cdf0383`
**Message:** Docs: add deployment rules to CLAUDE.md Critical Alerts so a
**Fetched:** 2026-04-08 16:28:59

```
2026-04-08 21:07:31  ✅ Server ready at http://127.0.0.1:10000
2026-04-08 21:07:31  🌐 Listening on port 10000...
2026-04-08 21:07:31  🔧 Building Fastify server...
2026-04-08 21:07:31  ✅ Imports loaded successfully
2026-04-08 21:07:31    ENCRYPTION_KEY: ✓ Set
2026-04-08 21:07:31    SESSION_SECRET: ✓ Set
2026-04-08 21:07:31    DATABASE_URL: ✓ Set
2026-04-08 21:07:31    PORT: 10000
2026-04-08 21:07:31    NODE_ENV: production
2026-04-08 21:07:31  📋 Environment check:
2026-04-08 21:07:31  🚀 TimeFlow backend starting...
2026-04-08 21:07:25  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-08 19:10:02  ✅ Server ready at http://127.0.0.1:10000
2026-04-08 19:10:02  🌐 Listening on port 10000...
2026-04-08 19:10:02  🔧 Building Fastify server...
2026-04-08 19:10:02  ✅ Imports loaded successfully
2026-04-08 19:10:02    ENCRYPTION_KEY: ✓ Set
2026-04-08 19:10:02    SESSION_SECRET: ✓ Set
2026-04-08 19:10:02    DATABASE_URL: ✓ Set
2026-04-08 19:10:02    PORT: 10000
2026-04-08 19:10:02    NODE_ENV: production
2026-04-08 19:10:02  📋 Environment check:
2026-04-08 19:10:02  🚀 TimeFlow backend starting...
2026-04-08 19:09:55  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-08 18:45:09  {"level":50,"time":1775673909690,"pid":53,"hostname":"srv-d56336m3jp1c73a6mbsg-hibernate-c66878c75-lsmbm","reqId":"req-j","err":{"type":"PrismaClientInitializationError","message":"\nInvalid `prisma.user.upsert()` invocation:\n\n\nAuthentication failed against database server at `aws-1-us-east-1.pooler.supabase.com`, the provided database credentials for `postgres` are not valid.\n\nPlease make sure to provide valid database credentials for the database server at `aws-1-us-east-1.pooler.supabase.com`.","stack":"PrismaClientInitializationError: \nInvalid `prisma.user.upsert()` invocation:\n\n\nAuthentication failed against database server at `aws-1-us-east-1.pooler.supabase.com`, the provided database credentials for `postgres` are not valid.\n\nPlease make sure to provide valid database credentials for the database server at `aws-1-us-east-1.pooler.supabase.com`.\n    at $n.handleRequestError (/opt/render/project/src/timeflow/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:7615)\n    at $n.handleAndLogRequestError (/opt/render/project/src/timeflow/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/opt/render/project/src/timeflow/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/opt/render/project/src/timeflow/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async handleGoogleCallback (/opt/render/project/src/timeflow/apps/backend/dist/index.js:710430:16)\n    at async Object.handleGoogleCallback2 (/opt/render/project/src/timeflow/apps/backend/dist/index.js:710639:18)","name":"PrismaClientInitializationError","clientVersion":"5.22.0"},"msg":"Failed to handle Google callback"}
2026-04-08 18:45:09  Please make sure to provide valid database credentials for the database server at `aws-1-us-east-1.pooler.supabase.com`.
2026-04-08 18:45:09  
2026-04-08 18:45:09  Authentication failed against database server at `aws-1-us-east-1.pooler.supabase.com`, the provided database credentials for `postgres` are not valid.
2026-04-08 18:45:09  
2026-04-08 18:45:09  
2026-04-08 18:45:09  Invalid `prisma.user.upsert()` invocation:
2026-04-08 18:45:09  prisma:error 
2026-04-08 18:44:55  ✅ Server ready at http://127.0.0.1:10000
2026-04-08 18:44:55  🌐 Listening on port 10000...
2026-04-08 18:44:54  🔧 Building Fastify server...
2026-04-08 18:44:54  ✅ Imports loaded successfully
2026-04-08 18:44:54    ENCRYPTION_KEY: ✓ Set
2026-04-08 18:44:54    SESSION_SECRET: ✓ Set
2026-04-08 18:44:54    DATABASE_URL: ✓ Set
2026-04-08 18:44:54    PORT: 10000
2026-04-08 18:44:54    NODE_ENV: production
2026-04-08 18:44:54  📋 Environment check:
2026-04-08 18:44:54  🚀 TimeFlow backend starting...
2026-04-08 18:44:48  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-08 10:43:50  ✅ Server ready at http://127.0.0.1:10000
2026-04-08 10:43:49  🌐 Listening on port 10000...
2026-04-08 10:43:49  🔧 Building Fastify server...
2026-04-08 10:43:49  ✅ Imports loaded successfully
2026-04-08 10:43:49    ENCRYPTION_KEY: ✓ Set
2026-04-08 10:43:49    SESSION_SECRET: ✓ Set
2026-04-08 10:43:49    DATABASE_URL: ✓ Set
2026-04-08 10:43:49    PORT: 10000
2026-04-08 10:43:49    NODE_ENV: production
2026-04-08 10:43:49  📋 Environment check:
2026-04-08 10:43:49  🚀 TimeFlow backend starting...
2026-04-08 10:43:43  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-08 08:46:03  ✅ Server ready at http://127.0.0.1:10000
2026-04-08 08:46:03  🌐 Listening on port 10000...
2026-04-08 08:46:02  🔧 Building Fastify server...
2026-04-08 08:46:02  ✅ Imports loaded successfully
2026-04-08 08:46:02    ENCRYPTION_KEY: ✓ Set
2026-04-08 08:46:02    SESSION_SECRET: ✓ Set
2026-04-08 08:46:02    DATABASE_URL: ✓ Set
2026-04-08 08:46:02    PORT: 10000
2026-04-08 08:46:02    NODE_ENV: production
2026-04-08 08:46:02  📋 Environment check:
2026-04-08 08:46:02  🚀 TimeFlow backend starting...
2026-04-08 08:45:57  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-07 22:47:31  ✅ Server ready at http://127.0.0.1:10000
2026-04-07 22:47:31  🌐 Listening on port 10000...
2026-04-07 22:47:30  🔧 Building Fastify server...
2026-04-07 22:47:30  ✅ Imports loaded successfully
2026-04-07 22:47:30    ENCRYPTION_KEY: ✓ Set
2026-04-07 22:47:30    SESSION_SECRET: ✓ Set
2026-04-07 22:47:30    DATABASE_URL: ✓ Set
2026-04-07 22:47:30    PORT: 10000
2026-04-07 22:47:30    NODE_ENV: production
2026-04-07 22:47:30  📋 Environment check:
2026-04-07 22:47:30  🚀 TimeFlow backend starting...
2026-04-07 22:47:25  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-07 19:44:50  ✅ Server ready at http://127.0.0.1:10000
2026-04-07 19:44:50  🌐 Listening on port 10000...
2026-04-07 19:44:50  🔧 Building Fastify server...
2026-04-07 19:44:50  ✅ Imports loaded successfully
2026-04-07 19:44:50    ENCRYPTION_KEY: ✓ Set
2026-04-07 19:44:50    SESSION_SECRET: ✓ Set
2026-04-07 19:44:50    DATABASE_URL: ✓ Set
2026-04-07 19:44:50    PORT: 10000
2026-04-07 19:44:50    NODE_ENV: production
2026-04-07 19:44:50  📋 Environment check:
2026-04-07 19:44:50  🚀 TimeFlow backend starting...
2026-04-07 19:44:44  ==> Running 'cd apps/backend && node dist/index.js'
2026-04-07 16:16:20  ✅ Server ready at http://127.0.0.1:10000
2026-04-07 16:16:20  🌐 Listening on port 10000...
2026-04-07 16:16:19  🔧 Building Fastify server...
2026-04-07 16:16:19  ✅ Imports loaded successfully
2026-04-07 16:16:19    ENCRYPTION_KEY: ✓ Set
2026-04-07 16:16:19    SESSION_SECRET: ✓ Set
2026-04-07 16:16:19    DATABASE_URL: ✓ Set
2026-04-07 16:16:19    PORT: 10000
```
