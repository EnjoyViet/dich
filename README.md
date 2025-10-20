# AI Interpreter (Vercel serverless proxy)

This project contains a simple browser frontend (`index.html`) and a Vercel serverless function (`/api/process-audio`) that hides your Google Cloud API key.

## Features
- Record audio in browser (webm/opus)
- Send audio to serverless function (/api/process-audio)
- Serverless function calls Google Speech-to-Text (auto language detection among ko/vi/en/zh/ja)
- Serverless function calls Google Generative Language (Gemini) to translate into target language
- Returns transcript + detected language + translation
- Frontend plays TTS using browser `speechSynthesis`

## Deploy to Vercel (steps)
1. Create a GitHub repository and push this project (or upload the files via GitHub UI).
2. Sign in to https://vercel.com and import the GitHub repository as a new project.
3. In Vercel dashboard for the project, go to Settings → Environment Variables and add:
   - `GOOGLE_API_KEY` = your Google Cloud API key (enable Speech-to-Text & Generative Language APIs)
4. Deploy. Vercel will build and provide a domain like `https://your-project.vercel.app/`.
5. Open the site on your phone and allow microphone access.

## Notes & Security
- **Do not** commit your API key to GitHub. Use Vercel environment variables.
- For production, consider quota, billing and rate limits on Google Cloud.
- The Speech-to-Text part uses `speech:recognize` synchronous endpoint which works for short audio clips. For longer audios, use `longrunningrecognize` or handle chunked uploads.
