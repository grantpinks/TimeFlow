2025-12-25T21:26:05.83284363Z ==> Cloning from https://github.com/grantpinks/TimeFlow
2025-12-25T21:26:06.883469372Z ==> Checking out commit 37e56243ec80b2ab4abac7d1141c386e6747e73a in branch main
2025-12-25T21:26:07.868649108Z ==> Using Node.js version 22.16.0 (default)
2025-12-25T21:26:07.893188447Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2025-12-25T21:26:09.802405088Z ==> Running build command 'pnpm install && pnpm prisma generate && pnpm build'...
2025-12-25T21:26:45.249079435Z Prisma schema loaded from prisma/schema.prisma
2025-12-25T21:26:46.750414954Z 
2025-12-25T21:26:46.750449926Z ✔ Generated Prisma Client (v5.22.0) to ./../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 722ms
2025-12-25T21:26:46.750458017Z 
2025-12-25T21:26:46.750463607Z Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
2025-12-25T21:26:46.750468167Z 
2025-12-25T21:26:46.750473238Z Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
2025-12-25T21:26:46.750478178Z 
2025-12-25T21:26:47.304291553Z 
2025-12-25T21:26:47.304316844Z > @timeflow/backend@0.1.0 build /opt/render/project/src/timeflow/apps/backend
2025-12-25T21:26:47.304321765Z > tsc -p tsconfig.json
2025-12-25T21:26:47.304325295Z 
2025-12-25T21:27:26.640880232Z ==> Uploading build...
2025-12-25T21:27:50.033601802Z ==> Uploaded in 10.9s. Compression took 12.5s
2025-12-25T21:27:55.069415979Z ==> Build successful 🎉
2025-12-25T21:28:31.016823479Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2025-12-25T21:28:31.1007103Z ==> Deploying...
2025-12-25T21:29:16.129591076Z ==> Running 'npx prisma migrate deploy && node dist/index.js'
2025-12-25T21:29:22.635565904Z Prisma schema loaded from prisma/schema.prisma
2025-12-25T21:29:22.642959352Z Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-us-east-1.pooler.supabase.com:6543"
2025-12-25T21:29:33.455520203Z ==> No open ports detected, continuing to scan...
2025-12-25T21:29:33.621716911Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:30:34.881817452Z ==> No open ports detected, continuing to scan...
2025-12-25T21:30:35.08846156Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:31:36.409117327Z ==> No open ports detected, continuing to scan...
2025-12-25T21:31:36.587465211Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:32:37.859554238Z ==> No open ports detected, continuing to scan...
2025-12-25T21:32:38.045548851Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:33:39.318918532Z ==> No open ports detected, continuing to scan...
2025-12-25T21:33:39.484402259Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding