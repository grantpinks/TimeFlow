2025-12-26T00:43:14.026450386Z ==> Cloning from https://github.com/grantpinks/TimeFlow
2025-12-26T00:43:14.982639778Z ==> Checking out commit afe4d51b50e57ee513c2232b1155b5346510c3da in branch main
2025-12-26T00:43:16.106714621Z ==> Using Node.js version 22.16.0 (default)
2025-12-26T00:43:16.130107481Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2025-12-26T00:43:18.215153961Z ==> Running build command 'pnpm install && pnpm prisma generate && pnpm build'...
2025-12-26T00:43:50.990892178Z Prisma schema loaded from prisma/schema.prisma
2025-12-26T00:43:51.456685059Z 
2025-12-26T00:43:51.456707831Z ✔ Generated Prisma Client (v5.22.0) to ./../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 235ms
2025-12-26T00:43:51.456713731Z 
2025-12-26T00:43:51.456718321Z Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
2025-12-26T00:43:51.456722012Z 
2025-12-26T00:43:51.456726152Z Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
2025-12-26T00:43:51.456729832Z 
2025-12-26T00:43:52.085431715Z 
2025-12-26T00:43:52.085460116Z > @timeflow/backend@0.1.0 build /opt/render/project/src/timeflow/apps/backend
2025-12-26T00:43:52.085466147Z > node esbuild.config.js
2025-12-26T00:43:52.085469867Z 
2025-12-26T00:43:52.172791259Z 
2025-12-26T00:43:52.172824421Z   dist/index.js  158.9kb
2025-12-26T00:43:52.172828521Z 
2025-12-26T00:43:52.172832261Z ⚡ Done in 19ms
2025-12-26T00:43:52.174212528Z ✅ Backend bundled successfully
2025-12-26T00:43:54.640207115Z ==> Uploading build...
2025-12-26T00:44:15.363756733Z ==> Uploaded in 10.8s. Compression took 9.9s
2025-12-26T00:44:15.458803333Z ==> Build successful 🎉
2025-12-26T00:44:19.409453435Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2025-12-26T00:44:19.469371006Z ==> Deploying...
2025-12-26T00:45:16.489852369Z ==> Running 'npx prisma migrate deploy && node dist/index.js'
2025-12-26T00:45:23.681256079Z Prisma schema loaded from prisma/schema.prisma
2025-12-26T00:45:23.685464663Z Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-us-east-1.pooler.supabase.com:6543"
2025-12-26T00:45:30.216894148Z ==> No open ports detected, continuing to scan...
2025-12-26T00:45:30.389253208Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-26T00:46:31.684935976Z ==> No open ports detected, continuing to scan...
2025-12-26T00:46:31.855964783Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-26T00:47:33.226510998Z ==> No open ports detected, continuing to scan...
2025-12-26T00:47:33.410330342Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-26T00:48:34.740279755Z ==> No open ports detected, continuing to scan...
2025-12-26T00:48:34.961289555Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-26T00:49:36.244496163Z ==> No open ports detected, continuing to scan...
2025-12-26T00:49:36.411746729Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2025-12-26T00:50:12.197232195Z ==> Port scan timeout reached, no open ports detected. Bind your service to at least one port. If you don't need to receive traffic on any port, create a background worker instead.
2025-12-26T00:50:12.368770385Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding