20:51:52.660 Running build in Washington, D.C., USA (East) – iad1
20:51:52.661 Build machine configuration: 2 cores, 8 GB
20:51:52.788 Cloning github.com/grantpinks/TimeFlow (Branch: main, Commit: 07b3041)
20:51:54.469 Cloning completed: 1.681s
20:51:54.680 Restored build cache from previous deployment (4yLLPUGPPTW5yVoeHckR3HM19oXp)
20:51:55.007 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
20:51:55.008 Running "vercel build"
20:51:55.633 Vercel CLI 50.42.0
20:51:55.978 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
20:51:55.983 Running "install" command: `sed -i 's/workspace:\*/*/g' apps/web/package.json && npm install --legacy-peer-deps`...
20:52:07.185 
20:52:07.185 up to date, audited 841 packages in 11s
20:52:07.186 
20:52:07.186 301 packages are looking for funding
20:52:07.187   run `npm fund` for details
20:52:07.302 
20:52:07.303 11 vulnerabilities (4 moderate, 7 high)
20:52:07.303 
20:52:07.304 To address issues that do not require attention, run:
20:52:07.304   npm audit fix
20:52:07.304 
20:52:07.304 To address all issues (including breaking changes), run:
20:52:07.305   npm audit fix --force
20:52:07.305 
20:52:07.305 Run `npm audit` for details.
20:52:07.322 Detected Next.js version: 14.2.35
20:52:07.324 Running "npm run build:web"
20:52:07.456 
20:52:07.457 > timeflow@0.1.0 build:web
20:52:07.457 > npm run build:packages && cd apps/web && npm run build
20:52:07.457 
20:52:07.590 
20:52:07.590 > timeflow@0.1.0 build:packages
20:52:07.590 > cd packages/shared && npm run build && cd ../scheduling && npm run build
20:52:07.590 
20:52:07.749 
20:52:07.749 > @timeflow/shared@0.1.0 build
20:52:07.749 > tsc
20:52:07.750 
20:52:09.648 
20:52:09.649 > @timeflow/scheduling@0.1.0 build
20:52:09.649 > tsc
20:52:09.649 
20:52:11.419 
20:52:11.419 > @timeflow/web@0.1.0 build
20:52:11.420 > next build
20:52:11.420 
20:52:12.135   ▲ Next.js 14.2.35
20:52:12.136 
20:52:12.207    Creating an optimized production build ...
20:52:12.383  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
20:52:19.064 Failed to compile.
20:52:19.065 
20:52:19.065 ./src/lib/supabase/middleware.ts:1:1
20:52:19.065 Module not found: Can't resolve '@supabase/ssr'
20:52:19.066 [0m[31m[1m>[22m[39m[90m 1 |[39m [36mimport[39m { createServerClient } [36mfrom[39m [32m'@supabase/ssr'[39m[33m;[39m[0m
20:52:19.066 [0m [90m   |[39m [31m[1m^[22m[39m[0m
20:52:19.066 [0m [90m 2 |[39m [36mimport[39m { type [33mNextRequest[39m[33m,[39m [33mNextResponse[39m } [36mfrom[39m [32m'next/server'[39m[33m;[39m[0m
20:52:19.066 [0m [90m 3 |[39m[0m
20:52:19.066 [0m [90m 4 |[39m [90m/**[39m[0m
20:52:19.067 
20:52:19.067 https://nextjs.org/docs/messages/module-not-found
20:52:19.067 
20:52:19.067 Import trace for requested module:
20:52:19.067 ./src/middleware.ts
20:52:19.068 
20:52:19.076 
20:52:19.080 > Build failed because of webpack errors
20:52:19.127 npm error Lifecycle script `build` failed with error:
20:52:19.128 npm error code 1
20:52:19.128 npm error path /vercel/path0/timeflow/apps/web
20:52:19.129 npm error workspace @timeflow/web@0.1.0
20:52:19.129 npm error location /vercel/path0/timeflow/apps/web
20:52:19.129 npm error command failed
20:52:19.130 npm error command sh -c next build
20:52:19.150 Error: Command "npm run build:web" exited with 1