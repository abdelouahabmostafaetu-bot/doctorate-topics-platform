DocMath AI — Azure integration v2
==================================

What's new in v2:
  1. Streaming answers (text appears live — much faster feel)
  2. Auto model routing (hidden from users):
       hard question  -> AZURE_OPENAI_DEPLOYMENT       (DeepSeek-V3.2)
       simple question-> AZURE_OPENAI_DEPLOYMENT_FAST  (Phi-4-reasoning)
       Thinking toggle ON -> always the strong model
  3. Sign-in required to use the chat (Auth.js session checked on server)
  4. Daily limits per user: 30 messages, 5 images, 3 PDF files
     + 6 requests per minute rate limit (all enforced server-side)
  5. Arabic fixed: RTL prose + LTR math (CSS in globals.css + prompt rules)
  6. Images: compressed in the browser (max 1280px JPEG) so uploads no
     longer fail; sent to a vision model when AZURE_OPENAI_DEPLOYMENT_VISION
     is configured (deploy Kimi-K2.6 later), otherwise converted to a note.
  7. Reading mode: computer/laptop only — completely hidden on phones.
  8. Model selector removed from the UI — users never see model names.

Files in this zip:
  src/app/api/chat/route.ts               NEW  secure API route
  src/components/topics/reading-chat.tsx  UPDATED chat
  src/components/topics/reading-mode.tsx  UPDATED desktop-only reading mode
  src/app/globals.css                     UPDATED (Arabic/KaTeX RTL fixes)
  ADD-TO-SCHEMA.prisma.txt                Prisma model to append to schema
  .env.local.example                      env template
  README-DEEPSEEK.txt                     this file

Install (PowerShell commands are provided in chat):
  1. Extract zip over the project
  2. Append the AiUsage model to prisma/schema.prisma
  3. Run: npx prisma db push
  4. Add the new env lines to your .env
  5. npm run dev and test

Vercel: add the same env variables in Settings -> Environment Variables.
