# ProCaptioner — AI Captions & Subtitles for Video

ProCaptioner is an AI-powered video transcription, subtitle styling, and video caption burning platform built for content creators, podcasters, and video editors.

## Features

- **Automated Speech Recognition (ASR):** High-accuracy transcription powered by Whisper models (`faster-whisper`).
- **Word-Level Alignment & Timing:** Precise phoneme/word-level subtitle synchronization.
- **LLM Subtitle Refinement:** Context-aware punctuation, capitalization, and grammar correction.
- **Interactive Caption Studio:** Custom font styling, karaoke animations, highlight colors, and layout presets.
- **Direct Video Burning:** Hardcode subtitles directly onto exported videos.
- **Multi-Language Translation:** Translate subtitles across multiple global languages.

## Project Structure

```
├── src/                  # TanStack Start / React Frontend
│   ├── routes/           # Application routes (/, /editor, /pricing)
│   ├── components/vyra/  # UI components (Hero, CaptionLab, EditorShowcase, etc.)
│   ├── components/ui/    # shadcn/ui components
│   └── styles.css        # Tailwind CSS & design tokens
├── backend/              # Python / FastAPI Processing Pipeline
│   ├── pipeline/         # Transcription, alignment, translation, burning
│   ├── models/           # Whisper models
│   ├── languages.py      # Supported language mappings
│   └── main.py           # Backend API entrypoint
└── public/               # Static assets & favicons
```

## Development

### Frontend

```sh
npm install
npm run dev
```

### Backend

```sh
cd backend
pip install -r requirements.txt
python main.py
```

## Tech Stack

- **Frontend:** TanStack Start, React 19, TypeScript, Tailwind CSS v4, Vite 8
- **Backend:** Python 3.13, FastAPI, Faster-Whisper, FFmpeg
