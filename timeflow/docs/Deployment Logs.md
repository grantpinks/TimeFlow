2025-12-25T21:38:39.084824361Z ==> Cloning from https://github.com/grantpinks/TimeFlow
2025-12-25T21:38:40.073829285Z ==> Checking out commit 49e460185eef9711a3ba79538a75e73843214fae in branch main
2025-12-25T21:39:11.203157627Z ==> Using Node.js version 22.16.0 (default)
2025-12-25T21:39:11.22674334Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2025-12-25T21:39:13.091460654Z ==> Running build command 'pnpm install && pnpm prisma generate && pnpm build'...
2025-12-25T21:39:50.70654522Z Prisma schema loaded from prisma/schema.prisma
2025-12-25T21:39:51.253966172Z 
2025-12-25T21:39:51.253990283Z ✔ Generated Prisma Client (v5.22.0) to ./../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 207ms
2025-12-25T21:39:51.253995643Z 
2025-12-25T21:39:51.253999843Z Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
2025-12-25T21:39:51.254003453Z 
2025-12-25T21:39:51.254007823Z Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
2025-12-25T21:39:51.254011224Z 
2025-12-25T21:39:51.772166689Z 
2025-12-25T21:39:51.77219285Z > @timeflow/backend@0.1.0 build /opt/render/project/src/timeflow/apps/backend
2025-12-25T21:39:51.772201111Z > esbuild src/index.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.js --packages=external
2025-12-25T21:39:51.772205211Z 
2025-12-25T21:39:51.817591884Z 
2025-12-25T21:39:51.817620456Z   dist/index.js  158.1kb
2025-12-25T21:39:51.817626086Z 
2025-12-25T21:39:51.817631666Z ⚡ Done in 10ms
2025-12-25T21:39:52.220418954Z ==> Uploading build...
2025-12-25T21:40:12.91693067Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2025-12-25T21:40:12.976016312Z ==> Deploying...
2025-12-25T21:40:10.639289336Z ==> Uploaded in 10.9s. Compression took 7.5s
2025-12-25T21:40:10.722484812Z ==> Build successful 🎉
2025-12-25T21:41:46.361717841Z ==> Running 'npx prisma migrate deploy && node dist/index.js'
2025-12-25T21:41:53.870967853Z Prisma schema loaded from prisma/schema.prisma
2025-12-25T21:41:53.960796782Z Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-us-east-1.pooler.supabase.com:6543"
2025-12-25T21:42:04.327035569Z ==> No open ports detected, continuing to scan...
2025-12-25T21:42:04.50334137Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:43:05.799534809Z ==> No open ports detected, continuing to scan...
2025-12-25T21:43:05.996368641Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:44:07.275817237Z ==> No open ports detected, continuing to scan...
2025-12-25T21:44:07.452217919Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:45:08.759519697Z ==> No open ports detected, continuing to scan...
2025-12-25T21:45:08.936469768Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:46:11.722038995Z ==> No open ports detected, continuing to scan...
2025-12-25T21:46:11.886785744Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:46:42.708251153Z ==> Port scan timeout reached, no open ports detected. Bind your service to at least one port. If you don't need to receive traffic on any port, create a background worker instead.
2025-12-25T21:46:42.888958488Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-25T21:55:14.340934048Z ==> Timed out: Port scan timeout reached, no open ports detected. Bind your service to at least one port. If you don't need to receive traffic on any port, create a background worker instead.
2025-12-25T21:55:14.401031396Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys