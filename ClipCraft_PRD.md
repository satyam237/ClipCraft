# PRD: **ClipCraft** — Web-First Screen Recorder + AI Enhancer (Loom × Screen Studio Lite × Course Toolkit)

**Document owner:** Satyam  
**Last updated:** 2026-02-14  
**Status:** Draft v1  
**Product type:** Web app (browser-based), with optional server-side processing pipeline  
**Primary platform:** macOS/Windows via Chromium browsers (Chrome/Edge). Safari support best-effort.

---

## 1) Summary

**ClipCraft** is a **web-first** screen recording and sharing platform for creators, teams, and educators. It combines:

- **Fast “Record → Share”** (Loom-style)  
- **Polished “Auto-enhanced exports”** (Screen Studio-inspired, web-feasible via server post-processing)  
- **Lightweight “Course-ready editing + assets”** (Camtasia-lite)

### 1.1 North Star Vision
Make it effortless to create **professional tutorial videos** from a browser: **record instantly**, **share securely**, and **auto-polish** with AI and smart post-processing.

### 1.2 Key Differentiator (USP)
**More than recording:** ClipCraft **auto-produces multiple deliverables** from one recording:

- Video (MP4 + share link)
- **Chapters + clickable table of contents**
- **Auto-generated title + description + tags**
- **AI summary + step list + transcript + captions**
- **Auto-highlight reel**
- **Sensitive-data blur suggestions**
- **“Course pack”**: slides/outline + quiz questions + notes

---

## 2) Problem & Opportunity

### 2.1 User problems
1. Recording tools are easy, but **polishing** takes time.  
2. Sharing is common, but **knowledge capture** (chapters, docs, steps) is weak.  
3. Course creators need **repeatable exports** (templates, branding, multi-format).  
4. Teams need **security + analytics + comments** without complexity.

### 2.2 Market opportunity
A web-first product with:
- Great UX for recording,
- Strong async post-processing,
- Practical AI add-ons,
can beat competitors by offering **end-to-end “content packaging”**.

---

## 3) Goals & Non-goals

### 3.1 Goals (MVP → V1)
- Record screen + webcam + mic reliably in browser
- Upload + share link within seconds of stopping recording
- Transcript + captions + chapters automatically
- Simple edits: trim, cut, remove section, blur, rebrand, export
- “Auto-polish” mode (server pipeline): zooms, cursor highlights, noise reduction, dynamic framing (approx.)
- Team workspaces, permissions, comments
- Analytics: views, watch time, drop-off

### 3.2 Non-goals (initially)
- Full multi-track timeline editor equal to Camtasia
- Perfect system-audio capture across all OS/browser combos
- Mobile recording (viewing OK; recording later)

---

## 4) Target Users & Personas

### 4.1 Personas
1. **SaaS Founder / PM**: product demos, changelog videos, onboarding  
2. **Course Creator**: structured lessons, branded exports, chapters, quizzes  
3. **Support / CS**: quick troubleshooting videos, internal KB  
4. **Recruiter / Hiring Manager**: async screening, feedback, training  
5. **Engineering / Sales**: walkthroughs, internal explainers

### 4.2 JTBD
- “When I explain something on my screen, help me produce a **professional video + documentation** quickly.”

---

## 5) Competitive Reverse-Inspiration (Feature Atoms)

> Not a clone—extract “feature atoms” that users love.

### 5.1 Loom-style atoms
- One-click record, instant link
- Viewer reactions & comments
- Workspace folders & privacy modes

### 5.2 Screen Studio atoms (web-feasible subset)
- Auto-zoom around cursor/clicks (approx via analysis + post-processing)
- Cursor smoothing and click emphasis (overlay)
- Polished “motion” feel

### 5.3 Camtasia atoms (lite)
- Trimming, cuts, crop
- Captions editing
- Callouts/annotations
- Branding presets, intros/outros

### 5.4 Add “more than competitors”
- “Knowledge pack” (summary, steps, TOC, quiz)
- Sensitive info detection (blur suggestions)
- Auto highlight reel + short clips
- AI title/description for YouTube/course platforms
- Multi-export templates (course, short, demo, internal)

---

## 6) Core User Journeys

### Journey A: Record → Share in 30 seconds
1. User opens app → **New Recording**
2. Select: screen/window/tab, mic, camera, quality preset
3. Record → pause/resume → stop
4. Upload starts immediately (chunked/resumable)
5. Video page loads with share link + transcript pending
6. AI enhancements appear asynchronously

### Journey B: Create a “Course Lesson Pack”
1. Record
2. Choose **Course Template**
3. ClipCraft generates:
   - lesson title, objectives
   - chapters
   - transcript + captions
   - lesson notes + quiz questions
4. User exports: MP4 + SRT + notes PDF/MD

### Journey C: Team Feedback Review
1. User shares link with “comment-only” permission
2. Reviewer leaves timestamped comment
3. Owner replies, resolves, exports updated version

---

## 7) Product Requirements (Functional)

## 7.1 Recording Module (Web)
**Features**
- Screen capture (tab/window/screen)
- Webcam capture + placement (corners, circle/square)
- Mic audio capture
- Recording controls: start/pause/resume/stop
- Countdown timer + hotkey hints (limited browser hotkeys)
- Device selection (mic/cam dropdown)
- Quality presets: 720p / 1080p (4K later)
- Recording indicators: red border, timer

**Use cases**
- Record a product demo with face cam
- Record a lesson with picture-in-picture
- Record a bug reproduction and share with dev

**Acceptance criteria**
- Recording works on Chrome/Edge latest
- Webcam overlay visible in final file
- Recording survives flaky network (local buffering + resumable upload)
- Final playable file produced for >30 minutes (target)

---

## 7.2 Upload & Storage
**Features**
- Chunked upload (resumable)
- Client-side preflight checks (disk, memory warnings)
- Post-record upload UI: progress, ETA, retry
- Store raw recording + derived outputs (transcoded MP4, thumbnails, waveform)

**Acceptance criteria**
- If upload fails mid-way, resumes without full restart
- User can copy share link once “raw playable” is ready

---

## 7.3 Video Processing Pipeline (Server)
**Stages**
1. **Ingest**: validate, virus scan (optional), store raw
2. **Transcode**: WebM → MP4 (H.264) + audio AAC; generate HLS for streaming
3. **Thumbnails**: keyframes + poster
4. **Audio enhancement**: normalization, optional noise suppression (server)
5. **AI**: transcript, captions, chapters, summary
6. **Auto-polish (optional)**:
   - detect cursor/click focus regions
   - generate zoom keyframes
   - apply smooth transitions
   - overlay cursor highlight/click rings
   - export “polished MP4”

**Acceptance criteria**
- Standard transcode completes within X minutes for Y minutes of video (define by infra)
- Video playback starts quickly (streaming via HLS/DASH)

---

## 7.4 Playback & Sharing
**Features**
- Video page with:
  - player + speed control
  - transcript (searchable)
  - chapters sidebar
  - share settings
  - download options (based on permissions)
- Privacy controls:
  - Public
  - Unlisted (link)
  - Workspace-only
  - Password protected
  - Domain restricted (enterprise)
- Share link + embed code
- Viewer reactions (emoji)
- Timestamped comments + mentions
- “Ask a question” field for viewers (optional)
- Export formats:
  - MP4
  - SRT/VTT
  - Transcript MD/TXT
  - Chapters JSON/MD

**Acceptance criteria**
- Comments sync in real-time (or near real-time)
- Transcript search jumps video to timestamp

---

## 7.5 Editing (Camtasia-lite)
**In-browser edits (MVP)**
- Trim start/end
- Cut segments (split & remove)
- Crop / blur region (manual)
- Replace intro/outro
- Add watermark/logo
- Add simple annotations:
  - text callout
  - arrow
  - highlight box
- Caption editor (fix words, timing adjustment)
- Export with preset profiles:
  - YouTube 1080p
  - Course 1080p + captions
  - Short vertical 9:16 (auto-crop) [V1+]
  - Internal low-size 720p

**Acceptance criteria**
- Changes produce a new version (non-destructive editing)
- Exports preserved with metadata + captions

---

## 7.6 AI Features (Practical, non-gimmicky)

### AI-1: Transcript + Captions
- Automatic speech recognition (ASR)
- Speaker detection (optional)
- Captions with punctuation + casing

**Outputs**: VTT/SRT + searchable transcript

### AI-2: Chapters
- Create chapters based on:
  - silence breaks
  - topic changes (embedding similarity)
  - click/interaction events (if available)
- Editable chapter titles & timestamps

### AI-3: Summary + Step-by-step
- “What this video covers”
- Steps extracted as checklist
- Key links/timestamps from spoken cues (e.g., “open settings”, “click export”)

### AI-4: Auto Title/Description/Tags
- YouTube-style title suggestions
- Short description
- Suggested tags

### AI-5: Sensitive Information Detection (Blur Suggestions)
Detect likely sensitive info:
- emails, phone numbers
- OTPs (6-digit codes), API keys patterns
- addresses, IDs
- account numbers
Generate blur suggestions timeline (user approves)

### AI-6: Highlight Reel
- Identify key moments (high energy, major actions, chapter peaks)
- Create 30–90s montage
- Optional “tweetable” clip presets

**Acceptance criteria for AI**
- AI outputs are editable
- Clear “confidence” indicators
- User approval required before applying blur

---

## 7.7 Course Toolkit (Differentiator)
**Features**
- Lesson template:
  - title, objectives
  - outline
  - key terms
  - quiz questions (MCQ + short answer)
  - downloadable notes (MD/PDF)
- “Course export pack” zip:
  - MP4
  - VTT/SRT
  - Notes.md
  - Quiz.md
  - Chapters.json
- Branding:
  - logo, theme, lower-thirds
  - intro/outro presets per course

---

## 7.8 Team & Admin
- Workspaces (org)
- Roles:
  - Owner, Admin, Member, Viewer
- Projects/folders
- Version history
- Audit logs (enterprise)

---

## 7.9 Notifications
- Email + in-app
- Processing completion
- Comment mentions/replies
- Export ready
- Access request

---

## 8) Non-Functional Requirements

### 8.1 Performance
- Recording should not drop frames excessively on typical laptops
- Playback starts <2 seconds for processed videos (target)
- Chunk uploads to handle weak networks

### 8.2 Reliability
- If user tab crashes: best-effort local recovery (IndexedDB)
- Resumable uploads
- Job retries for processing pipeline

### 8.3 Security & Privacy
- TLS everywhere
- Signed URLs for storage access
- Permission-based downloads
- Optional SSO (enterprise)
- Data retention policies (user-controlled)
- GDPR-friendly delete/export

### 8.4 Compliance (future-ready)
- SOC2 readiness: audit logs, least privilege, encryption at rest, vendor management
- DPA templates for enterprise customers

---

## 9) Metrics & Analytics

### 9.1 North Star Metric
- **Weekly Active Creators producing “share-ready assets”** (video + at least one AI deliverable used)

### 9.2 Key metrics
- Activation: % who complete first recording + share within 10 minutes
- Time-to-share: median time from stop → playable link
- AI adoption: % videos where users edit/use chapters/summary
- Retention: creators who record again within 7/30 days
- Virality: shares per recording; viewer-to-creator conversion
- Watch metrics: avg watch %, drop-off points

---

## 10) MVP Scope (Build Plan)

### MVP (V0) — “Record → Share + Transcript”
- Web recording (screen+cam+mic)
- Upload + share link
- Playback page
- Transcript + captions
- Basic trim
- Comments + reactions
- Workspace + folders
- Basic analytics

### V1 — “Auto Chapters + Knowledge Pack”
- Chapters + summary + steps
- Course export pack
- Branding presets
- Highlight reel
- Sensitive data blur suggestions

### V2 — “Auto Polish Mode”
- Cursor/click emphasis overlay
- Auto-zoom keyframes (server)
- Short/vertical exports
- Deeper admin + enterprise controls

---

## 11) UX / UI Requirements

### 11.1 Key screens
- Landing
- Auth (email + OAuth)
- Dashboard (recent videos, folders, search)
- Recorder setup modal
- Recording overlay controls
- Upload/progress screen
- Video page (player + transcript + chapters + comments)
- Editor (trim/cut/captions/blur/branding)
- Workspace settings (members, roles)
- Templates (course presets)
- Billing

### 11.2 UX principles
- “Fast path first”: record in <2 clicks
- Async enhancements: show value progressively
- Non-destructive editing: always keep raw original
- Explain AI: show why and how confident

---

## 12) Technical Design & Architecture

## 12.1 Recommended Tech Stack (Web-only)

### Frontend
- **Next.js** (App Router) + TypeScript
- UI: Tailwind + shadcn/ui
- State: Zustand or Redux Toolkit (light)
- Recording:
  - `navigator.mediaDevices.getDisplayMedia()`
  - `MediaRecorder`
  - Canvas compositing for webcam overlay
- Local persistence: IndexedDB (Dexie.js)
- Upload: TUS protocol or custom chunk upload

### Backend (API)
- **Node.js (NestJS)** or **FastAPI** (Python)
- Auth: Clerk/Auth0 or custom (JWT + refresh)
- DB: Postgres (Supabase/Neon/RDS)
- Cache/Queue: Redis
- Background jobs: BullMQ (Node) or Celery/RQ (Python)
- Storage: S3-compatible (AWS S3 / Cloudflare R2)
- CDN/Streaming: CloudFront + HLS, or Mux (simpler)
- Processing: FFmpeg workers (Docker)
- Search: Postgres full-text + optional OpenSearch later

### AI/ML
- ASR: Whisper family (self-host) or managed service
- Summarization/chapters: LLM (OpenAI/Anthropic/local) with cost controls
- PII detection: regex + NER model + heuristics
- Embeddings for chapter segmentation: text embedding model

### Observability
- Logs: OpenTelemetry + Loki/Datadog
- Tracing: OpenTelemetry
- Metrics: Prometheus/Grafana or managed
- Error monitoring: Sentry

### Payments (if SaaS)
- Stripe

---

## 12.2 System Components

1. **Web Recorder Client**
   - Captures streams
   - Encodes chunks
   - Buffers to IndexedDB
   - Uploads chunks with resumable protocol

2. **API Server**
   - Auth
   - Video metadata
   - Permissions & sharing
   - Comments & analytics events
   - Triggers processing jobs

3. **Processing Workers**
   - Transcode + thumbnails
   - Audio normalize
   - AI pipeline
   - Auto-polish render (optional)

4. **Storage + CDN**
   - Raw + derived artifacts
   - HLS segments
   - Thumbnails

---

## 12.3 Data Model (Simplified)

### Tables
- `users` (id, name, email, plan, created_at)
- `workspaces` (id, name, owner_id)
- `workspace_members` (workspace_id, user_id, role)
- `videos` (id, workspace_id, owner_id, title, status, duration, visibility, created_at)
- `video_assets` (id, video_id, type, url, metadata_json)
  - types: raw_webm, mp4, hls_manifest, thumbnail, waveform, srt, vtt, transcript_json, chapters_json, summary_md, highlights_mp4
- `comments` (id, video_id, user_id, timestamp_ms, body, created_at)
- `reactions` (id, video_id, user_id, emoji, timestamp_ms)
- `analytics_events` (id, video_id, user_id, type, payload, created_at)
- `processing_jobs` (id, video_id, job_type, status, attempts, logs)

---

## 12.4 API Endpoints (Example)

### Auth & Workspace
- `POST /auth/login`
- `GET /workspaces`
- `POST /workspaces`
- `POST /workspaces/:id/invite`

### Recording / Upload
- `POST /videos` → create video record, returns upload session
- `POST /uploads/init` → returns signed URLs/parts
- `PUT /uploads/:session/part/:n` → upload chunk
- `POST /uploads/complete` → finalize and trigger processing

### Playback & Sharing
- `GET /videos/:id`
- `PATCH /videos/:id` (title, visibility)
- `GET /videos/:id/assets`
- `POST /videos/:id/share` (generate token, password)

### AI
- `POST /videos/:id/ai/transcribe`
- `POST /videos/:id/ai/summarize`
- `POST /videos/:id/ai/chapters`
- `POST /videos/:id/ai/pii-detect`
- `POST /videos/:id/ai/highlights`

### Comments
- `GET /videos/:id/comments`
- `POST /videos/:id/comments`
- `PATCH /comments/:id/resolve`

---

## 13) AI Design Details (Cost-Controlled)

### 13.1 Pipeline order
1. ASR transcript
2. Segmentation (chapters)
3. Summary + steps
4. PII detection (text + optional frame sampling)
5. Highlights

### 13.2 Quality & safety controls
- “Low cost mode” for free tier: smaller models, shorter context
- Cache transcripts and embeddings
- Human-in-the-loop for blur and title suggestions
- Redact sensitive outputs in logs

---

## 14) Pricing & Packaging (Suggested)

### Free
- Limited minutes/month
- Basic recording + share
- Transcript with watermark (optional)
- Limited exports

### Pro (Creators)
- More minutes
- Chapters + summary
- Branding presets
- Course export pack
- Highlights

### Team
- Workspace roles
- Admin analytics
- SSO (later)
- Audit logs (later)

---

## 15) Risks & Mitigations

1. **Browser recording reliability**
   - Mitigation: strong UX guardrails, Chrome-first, local buffering, fallback modes
2. **System audio limitations**
   - Mitigation: position product around mic audio; provide guidance + best-effort
3. **High infra costs (video + AI)**
   - Mitigation: quotas, tiering, async processing, caching, model selection
4. **“Auto-polish” complexity**
   - Mitigation: release as V2; start with overlays first, then zooms

---

## 16) QA Plan (High-level)

- Recording tests across:
  - macOS + Chrome/Edge
  - Windows + Chrome/Edge
- Long recording stress tests (30–60 min)
- Upload failure tests (drop network mid-way)
- Processing pipeline retries
- Permission tests (unlisted/password/workspace)
- Caption editing correctness
- Export validation (MP4 playable, SRT sync)

---

## 17) Roadmap (90-day build outline)

### Phase 1: Foundations
- Auth, workspaces, DB schema
- Recording MVP UI + capture + local buffer
- Chunk upload + finalize

### Phase 2: Playback + Share
- Video page + HLS playback
- Privacy modes + share tokens
- Comments + reactions

### Phase 3: Processing v1
- FFmpeg transcode + thumbnails
- ASR transcript + captions
- Basic trim editor

### Phase 4: AI Pack
- Chapters + summary + steps
- Searchable transcript
- Course export pack

### Phase 5: Differentiators
- PII blur suggestions
- Highlights
- Branding presets
- Analytics dashboard

---

## 18) Open Questions
- Which ASR path: self-host vs managed?
- Is “polish mode” always server-rendered or optional?
- Storage/CDN choice: Mux vs self-managed HLS?
- Billing: minutes-based or seat-based?

---

## 19) Appendix: Inspiration Checklist (Feature Ideas)

**Recorder**
- Multi-scene (screen only / screen+cam / cam only)
- “Presenter mode”: big cam, small screen
- “Focus mode”: blur background around window

**AI Enhancements**
- “Auto glossary” from transcript
- “Generate docs” (Markdown tutorial)
- “Convert to SOP” (support playbook)

**Team**
- Reviewer assignments
- Approval workflow for publishing
- “Internal KB” collections with search

---

## 20) Definition of Done (V1)
- Users can record and share reliably
- Transcripts/captions/chapters are accurate enough and editable
- Basic editing + export works
- Team sharing + comments work
- Costs are controlled with quotas and tiering
- Security basics in place (permissions, signed URLs, encryption)

---
