2025-12-25T20:37:24.06234088Z ==> Cloning from https://github.com/grantpinks/TimeFlow
2025-12-25T20:37:25.004782555Z ==> Checking out commit 9c00a9345aa15b67f8a877fb08f0619fa202ffe2 in branch main
2025-12-25T20:37:26.105565624Z ==> Using Node.js version 22.16.0 (default)
2025-12-25T20:37:26.130028156Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2025-12-25T20:37:28.02430818Z ==> Running build command 'pnpm install && pnpm prisma generate && pnpm build'...
2025-12-25T20:37:53.536757994Z Prisma schema loaded from prisma/schema.prisma
2025-12-25T20:37:54.139697662Z 
2025-12-25T20:37:54.139719103Z ✔ Generated Prisma Client (v5.22.0) to ./../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 369ms
2025-12-25T20:37:54.139724173Z 
2025-12-25T20:37:54.139728983Z Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
2025-12-25T20:37:54.139732484Z 
2025-12-25T20:37:54.139736604Z Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
2025-12-25T20:37:54.139740134Z 
2025-12-25T20:37:54.663943824Z 
2025-12-25T20:37:54.663970066Z > @timeflow/backend@0.1.0 build /opt/render/project/src/timeflow/apps/backend
2025-12-25T20:37:54.663975326Z > tsc -p tsconfig.json
2025-12-25T20:37:54.663979006Z 
2025-12-25T20:38:02.112853916Z src/controllers/assistantController.ts(50,7): error TS2345: Argument of type '{ id?: string; role?: "user" | "assistant"; content?: string; metadata?: Record<string, any>; timestamp?: string; }[]' is not assignable to parameter of type 'ChatMessage[]'.
2025-12-25T20:38:02.112878478Z   Type '{ id?: string; role?: "user" | "assistant"; content?: string; metadata?: Record<string, any>; timestamp?: string; }' is not assignable to type 'ChatMessage'.
2025-12-25T20:38:02.112885508Z     Property 'id' is optional in type '{ id?: string; role?: "user" | "assistant"; content?: string; metadata?: Record<string, any>; timestamp?: string; }' but required in type 'ChatMessage'.
2025-12-25T20:38:02.113086339Z src/controllers/authController.ts(103,7): error TS2769: No overload matches this call.
2025-12-25T20:38:02.11309791Z   Overload 1 of 5, '(options?: FastifyJwtVerifyOptions): Promise<{ sub: string; type?: string; }>', gave the following error.
2025-12-25T20:38:02.11310223Z     Object literal may only specify known properties, and 'token' does not exist in type 'FastifyJwtVerifyOptions'.
2025-12-25T20:38:02.11310592Z   Overload 2 of 5, '(callback: VerifierCallback): void', gave the following error.
2025-12-25T20:38:02.113110721Z     Object literal may only specify known properties, and 'token' does not exist in type 'VerifierCallback'.
2025-12-25T20:38:02.113114391Z   Overload 3 of 5, '(options?: Partial<VerifyOptions>): Promise<{ sub: string; type?: string; }>', gave the following error.
2025-12-25T20:38:02.113118221Z     Object literal may only specify known properties, and 'token' does not exist in type 'Partial<VerifyOptions>'.
2025-12-25T20:38:02.113192665Z src/controllers/categoryController.ts(64,67): error TS2345: Argument of type '{ name?: string; order?: number; color?: string; }' is not assignable to parameter of type '{ name: string; color: string; order?: number; }'.
2025-12-25T20:38:02.113198406Z   Property 'name' is optional in type '{ name?: string; order?: number; color?: string; }' but required in type '{ name: string; color: string; order?: number; }'.
2025-12-25T20:38:02.113341974Z src/controllers/emailController.ts(105,58): error TS2345: Argument of type '{ subject?: string; threadId?: string; body?: string; to?: string; inReplyTo?: string; }' is not assignable to parameter of type 'SendEmailRequest'.
2025-12-25T20:38:02.113348894Z   Property 'to' is optional in type '{ subject?: string; threadId?: string; body?: string; to?: string; inReplyTo?: string; }' but required in type 'SendEmailRequest'.
2025-12-25T20:38:02.113496693Z src/controllers/habitController.ts(72,48): error TS2345: Argument of type '{ description?: string; title?: string; durationMinutes?: number; frequency?: "daily" | "weekly" | "custom"; daysOfWeek?: string[]; preferredTimeOfDay?: "morning" | "afternoon" | "evening"; userId: string; }' is not assignable to parameter of type 'CreateHabitInput'.
2025-12-25T20:38:02.113509883Z   Property 'title' is optional in type '{ description?: string; title?: string; durationMinutes?: number; frequency?: "daily" | "weekly" | "custom"; daysOfWeek?: string[]; preferredTimeOfDay?: "morning" | "afternoon" | "evening"; userId: string; }' but required in type 'CreateHabitInput'.
2025-12-25T20:38:02.113515124Z src/controllers/scheduleController.ts(111,71): error TS2345: Argument of type '{ title?: string; taskId?: string; habitId?: string; start?: string; end?: string; }[]' is not assignable to parameter of type 'ApplyScheduleBlock[]'.
2025-12-25T20:38:02.113520034Z   Type '{ title?: string; taskId?: string; habitId?: string; start?: string; end?: string; }' is not assignable to type 'ApplyScheduleBlock'.
2025-12-25T20:38:02.113523804Z     Type '{ title?: string; taskId?: string; habitId?: string; start?: string; end?: string; }' is not assignable to type '{ habitId: string; start: string; end: string; title?: string; }'.
2025-12-25T20:38:02.113527304Z       Property 'habitId' is optional in type '{ title?: string; taskId?: string; habitId?: string; start?: string; end?: string; }' but required in type '{ habitId: string; start: string; end: string; title?: string; }'.
2025-12-25T20:38:02.113599079Z src/middlewares/auth.ts(31,77): error TS2769: No overload matches this call.
2025-12-25T20:38:02.113602759Z   Overload 1 of 5, '(options?: FastifyJwtVerifyOptions): Promise<{ sub: string; type?: string; }>', gave the following error.
2025-12-25T20:38:02.113605249Z     Argument of type 'string' is not assignable to parameter of type 'FastifyJwtVerifyOptions'.
2025-12-25T20:38:02.113607489Z   Overload 2 of 5, '(callback: VerifierCallback): void', gave the following error.
2025-12-25T20:38:02.113609619Z     Argument of type 'string' is not assignable to parameter of type 'VerifierCallback'.
2025-12-25T20:38:02.113611849Z   Overload 3 of 5, '(options?: Partial<VerifyOptions>): Promise<{ sub: string; type?: string; }>', gave the following error.
2025-12-25T20:38:02.1136153Z     Type 'string' has no properties in common with type 'Partial<VerifyOptions>'.
2025-12-25T20:38:02.11361917Z src/services/assistantService.ts(507,7): error TS2322: Type 'JsonValue' is not assignable to type 'DailyScheduleConfig'.
2025-12-25T20:38:02.11362333Z   Type 'string' has no properties in common with type 'DailyScheduleConfig'.
2025-12-25T20:38:02.113717155Z src/services/assistantService.ts(508,7): error TS2322: Type 'JsonValue' is not assignable to type 'DailyScheduleConfig'.
2025-12-25T20:38:02.113721395Z   Type 'string' has no properties in common with type 'DailyScheduleConfig'.
2025-12-25T20:38:02.113892985Z src/services/assistantService.ts(526,23): error TS2353: Object literal may only specify known properties, and 'mascotState' does not exist in type '{ schedulePreview?: SchedulePreview; action?: AssistantAction; }'.
2025-12-25T20:38:02.113922457Z src/services/assistantService.ts(581,9): error TS2353: Object literal may only specify known properties, and 'mascotState' does not exist in type '{ schedulePreview?: SchedulePreview; action?: AssistantAction; }'.
2025-12-25T20:38:02.113931167Z src/services/assistantService.ts(717,5): error TS2345: Argument of type 'JsonValue' is not assignable to parameter of type 'Record<string, { wakeTime?: string; sleepTime?: string; }>'.
2025-12-25T20:38:02.113933727Z   Type 'string' is not assignable to type 'Record<string, { wakeTime?: string; sleepTime?: string; }>'.
2025-12-25T20:38:02.113993841Z src/services/conversationService.ts(125,5): error TS2322: Type '{ conversationId: string; role: "user" | "assistant"; content: string; metadata: { schedulePreview?: SchedulePreview; action?: AssistantAction; }; }[]' is not assignable to type 'ConversationMessageCreateManyInput | ConversationMessageCreateManyInput[]'.
2025-12-25T20:38:02.113997311Z   Type '{ conversationId: string; role: "user" | "assistant"; content: string; metadata: { schedulePreview?: SchedulePreview; action?: AssistantAction; }; }[]' is not assignable to type 'ConversationMessageCreateManyInput[]'.
2025-12-25T20:38:02.113999611Z     Type '{ conversationId: string; role: "user" | "assistant"; content: string; metadata: { schedulePreview?: SchedulePreview; action?: AssistantAction; }; }' is not assignable to type 'ConversationMessageCreateManyInput'.
2025-12-25T20:38:02.114002041Z       Types of property 'metadata' are incompatible.
2025-12-25T20:38:02.114004731Z         Type '{ schedulePreview?: SchedulePreview; action?: AssistantAction; }' is not assignable to type 'NullableJsonNullValueInput | InputJsonValue'.
2025-12-25T20:38:02.114007252Z           Type '{ schedulePreview?: SchedulePreview; action?: AssistantAction; }' is not assignable to type 'InputJsonObject'.
2025-12-25T20:38:02.114009902Z             Property 'schedulePreview' is incompatible with index signature.
2025-12-25T20:38:02.114012042Z               Type 'SchedulePreview' is not assignable to type 'InputJsonValue'.
2025-12-25T20:38:02.114014602Z                 Type 'SchedulePreview' is not assignable to type 'InputJsonObject'.
2025-12-25T20:38:02.114016772Z                   Index signature for type 'string' is missing in type 'SchedulePreview'.
2025-12-25T20:38:02.114065555Z src/services/habitSuggestionService.ts(89,5): error TS2322: Type 'string | number | true | JsonObject | JsonArray' is not assignable to type 'DailyScheduleConfig'.
2025-12-25T20:38:02.114068605Z   Type 'string' has no properties in common with type 'DailyScheduleConfig'.
2025-12-25T20:38:02.114072265Z src/services/habitSuggestionService.ts(152,22): error TS2339: Property 'id' does not exist on type 'string'.
2025-12-25T20:38:02.114077666Z src/services/scheduleService.ts(85,5): error TS2322: Type 'string | number | true | JsonObject | JsonArray' is not assignable to type 'DailyScheduleConfig'.
2025-12-25T20:38:02.114080716Z   Type 'string' has no properties in common with type 'DailyScheduleConfig'.
2025-12-25T20:38:02.114085266Z src/services/scheduleService.ts(334,5): error TS2322: Type 'string | number | true | JsonObject | JsonArray' is not assignable to type 'DailyScheduleConfig'.
2025-12-25T20:38:02.114087546Z   Type 'string' has no properties in common with type 'DailyScheduleConfig'.
2025-12-25T20:38:02.223910412Z  ELIFECYCLE  Command failed with exit code 2.
2025-12-25T20:38:02.272501015Z ==> Build failed 😞
2025-12-25T20:38:02.272517686Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys