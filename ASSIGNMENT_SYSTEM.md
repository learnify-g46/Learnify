# Assignment Management System — what was added

This feature was added on top of the existing Learnify codebase (same MongoDB/Cloudinary/Gemini
stack you already had — nothing new to sign up for or configure).

## 1. New backend files
- `backend/models/assignmentModel.js` — Assignment schema (mcq / typed / pdf)
- `backend/models/assignmentSubmissionModel.js` — one submission doc per student per assignment
- `backend/utils/ocr.js` — SHA-256 file hashing + text extraction (pdf-parse for PDFs, tesseract.js OCR for images)
- `backend/utils/duplicateDetection.js` — n-gram text-similarity check (advisory duplicate flag)
- `backend/controllers/assignmentController.js` — all assignment logic
- `backend/routes/assignmentRoute.js` — mounted at `/api/assignment` in `backend/index.js`

## 2. New frontend files
- `frontend/src/pages/admin/ManageAssignment.jsx` — teacher: create (MCQ/Typed/PDF, AI-generate for MCQ & Typed), list, delete
- `frontend/src/pages/admin/ReviewAssignmentSubmissions.jsx` — teacher: submissions table, review/grade panel, duplicate flags, release results
- `frontend/src/pages/StudentAssignments.jsx` — student: assignment list with status badges, submit flow per type

New routes in `App.jsx`:
- `/manageassignment/:courseId` (educator)
- `/review-assignment/:assignmentId` (educator)
- `/assignments/:courseId` (student, any logged-in user)

New nav entries:
- "Assignments" button next to "Quiz" in Courses.jsx (table + mobile card) and Dashboard.jsx (per-course row)
- "Assignments" button next to "Take Quiz" in ViewLecture.jsx (student side)
- "Pending Assignments" widget on StudentDashboard.jsx

## 3. New dependencies (added to `backend/package.json`)
- `pdf-parse` — reads the text layer out of a PDF (pure JS, no native build tools needed)
- `tesseract.js` — OCR for uploaded images (pure JS/WASM, no native build tools needed)

Run `npm install` inside `backend/` once after pulling this to install them (also installs on first `npm run dev` if you use an auto-install hook).

No new environment variables are required — nothing new to add to `.env`.

## 4. How each assignment type works

### MCQ
Same shape as the existing Quiz system. Teacher can AI-generate questions (Gemini) or add manually,
edits them, publishes. Auto-graded instantly on student submission.

### Typed / Code
Teacher writes/AI-generates questions + marking criteria. Student types an answer (a code question
just means "paste your code as text" — **no code is ever executed on the server**, by design, since
there's no secure sandbox in this stack; this matches the honest fallback your original spec allowed
for). Gemini gives a suggested mark + feedback per question immediately after submission; the
teacher always has final say in the Review screen before it counts as the student's real score.
Copy-paste is tracked client-side as a simple counter shown to the teacher — this is a best-effort
signal only, never proof of anything, and never auto-penalizes.

### PDF / Handwritten
Student uploads a PDF or an image (jpg/png) of their work. It's stored on Cloudinary (same as every
other file in this app — no AWS S3 is configured anywhere in this project, so this reuses what's
already there). On upload:
1. SHA-256 hash of the file → flags an **exact** duplicate against other students' submissions for
   the same assignment.
2. Text extraction:
   - **Typed/exported PDF** → read directly via its text layer (pdf-parse). Fully automatic, accurate.
   - **Image (jpg/png)** → real OCR via tesseract.js. Fully automatic, works out of the box.
   - **Scanned/handwritten PDF** (no text layer) → **honest limitation**: turning PDF *pages* into
     images for OCR needs native dependencies (canvas/poppler/ghostscript) that aren't bundled here
     to keep `npm install` simple on a plain machine. These submissions are flagged `needs_review`
     and the teacher opens the original file directly from the Review screen — nothing is faked.
     If you want true scanned-PDF OCR later, that's a documented follow-up (see below), not something
     silently pretended to work.
3. If text was extracted, it's compared (n-gram similarity) against other submissions for the same
   assignment ≥95% similar → flagged `potential_duplicate`. **Every duplicate flag is advisory only**
   — it never auto-zeroes, auto-rejects, or hides a submission. The teacher sees both submissions
   side-by-side-ish (links/text) and decides.
4. Gemini gives a suggested mark + feedback from the extracted text (skipped when no text was
   extracted) — again, teacher has final say.

### Due dates / late submissions
Enforced server-side (`isPastDue` check in the controller) — a late submission is blocked unless the
teacher turned on "Allow late submission" for that assignment, and a late-submission % penalty can be
configured, applied automatically to MCQ auto-grading (typed/pdf go through teacher review anyway).

### Result release
Each assignment has a `resultReleaseMode`: immediate / manual / after-due-date. In manual mode (the
default), students don't see marks/feedback until the teacher clicks "Release Results to Students" on
the Review screen.

## 5. Known limitations (stated plainly, not hidden)
- **No OCR for scanned/handwritten PDFs** — only typed-text PDFs and image uploads get automatic
  text extraction, as explained above. Teachers can still grade these manually from the original file.
- **No code execution** — typed "code" answers are graded by AI + teacher review only, never run.
- **No background job queue** — AI grading/OCR run synchronously when the student submits (a few
  seconds for typical assignment lengths). Fine for a college-scale class; a real queue (BullMQ+Redis)
  would be the next step if this needed to scale much further.
- **Duplicate detection is a similarity heuristic**, not a plagiarism-detection product — good enough
  to flag likely copies for a teacher to look at, never a verdict on its own.
- The "paste attempt" counter is a basic `onPaste` listener — it's a best-effort signal, not a real
  anti-cheating mechanism (trivially bypassed by typing from another screen, which is expected and
  fine — it's just a flag shown to the teacher, never a penalty applied automatically).

## 6. How to test locally
1. `cd backend && npm install && npm run dev`
2. `cd frontend && npm install && npm run dev`
3. Log in as an educator → Courses → "Assignments" on any course → create an MCQ assignment (try AI
   generate), publish it.
4. Log in as a student enrolled in that course → course lecture page → "Assignments" button →
   submit it → see the auto-graded score immediately (if `resultReleaseMode` is "immediate") or after
   the teacher releases it (if "manual", the default).
5. Repeat for a Typed assignment (check the AI-suggested mark appears for the teacher in Review) and
   a PDF assignment (upload a text PDF and an image to see both extraction paths; try uploading the
   exact same file as two different students to see the exact-duplicate flag).

All of the above was verified by:
- `node --check` on every new/changed backend file (all pass)
- Booting the backend (`node index.js`) — starts cleanly, all new routes/controllers/models load with
  zero import errors (the only failure in this sandbox is the Mongo Atlas connection itself, since
  this cloud sandbox can't reach your cluster's DNS — that will connect fine on your machine)
- `npx vite build` on the frontend — builds cleanly with zero errors across all new/changed pages and
  the routes wired into `App.jsx`

What could **not** be verified here (no database access from this sandbox): actual end-to-end
submission flow against live data, AI grading output quality, and the duplicate-detection flagging in
practice. Please run through the steps in section 6 once on your machine — if anything doesn't behave
as described, tell me the exact error/screen and I'll fix it.

## Update — Learnify Assistant (chatbot)
- Renamed to "Learnify Assistant", with course-aware quick suggestions and a "thinking" indicator.
- Course suggestions come ONLY from the Learnify catalog: when a student asks for a course / roadmap / "kya seekhu", the backend gives the model the published courses (minus ones the student already has), checks the reply, and returns clickable course cards. Replies that name outside platforms (Udemy, Coursera, ...) or invented courses are replaced by a real answer from our own database.
- If the AI service is down, course requests are still answered from our database; doubts show a friendly "high demand" notice with a Try again button. Students never see API/provider text.
- Friendly messages for: busy, timeout, offline, server unreachable, session expired, rate limit (20 msgs/min per student), empty and too-long messages. After 3 service failures in a row a maintenance notice is shown.

## Update — Login / Google sign-in / JWT fixes
- Google sign-in now sends the Firebase ID token; the backend verifies it (signature, issuer, audience, expiry) and takes name/email from the token, never from the request body. Only the Firebase project id is needed (`FIREBASE_PROJECT_ID`, default `mainlms-78eba`) - no service account.
- A new Google user is asked to pick Student / Educator first (the Login page used to send an empty role -> 500).
- Roles allowed at signup: student, educator. `admin` can never be self-assigned.
- Password hash / OTP fields / token version are never sent to the browser.
- Logout and password reset invalidate old JWTs (`tokenVersion`). Existing sessions keep working.
- Google-only accounts trying password login get a clear message instead of a crash.
- OTP: 6 digits, random, stored hashed, 5 minute expiry, 5 attempts, single use. A failed OTP email now returns a friendly 503 instead of crashing the server.
- Google/Firebase errors show readable messages (popup closed, unauthorised domain, provider disabled, bad API key, network).
- CORS: `CLIENT_URLS` (comma separated) in backend `.env`; defaults to http://localhost:5173 and http://127.0.0.1:5173.
- In production (NODE_ENV=production) cookies use SameSite=None + Secure so a separately hosted frontend works.
- Firebase console still needs: Google provider enabled, `localhost` under Authorized domains, API key from the same project.

## Update — Education-only chatbot + rate limiting
**Chatbot (Learnify Assistant)**
- Visible only to logged-in users (visitors use "Search with AI").
- Only studies and Learnify courses: course suggestions come from the Learnify catalog; doubts about coding / tech / math / science / study topics are answered.
- Anything else (jokes, movies, sports, politics, recipes, ...) and prompt-injection attempts ("ignore previous instructions", "show your system prompt", "you are now DAN") get one fixed reply: "I can only help with your studies." These are stopped before the AI is called, so no AI quota is used. A second layer in the prompt makes the model answer with a marker for borderline off-topic messages, which the server replaces with the same reply.

**Rate limiting** (`backend/middlewares/rateLimit.js`, package `express-rate-limit`)
| Where | Limit |
|---|---|
| Login / signup | 10 FAILED tries per 15 min per IP + email (successful logins never count) |
| Google sign-in | 30 failed per 15 min per IP |
| Send OTP | 3 per 10 min per e-mail |
| Verify OTP / reset password | 10 per 10 min per IP + e-mail |
| Search with AI | 30 per minute per IP |
| Live search (typing) | 90 per minute per IP |
| Uploads (course/lecture files, profile photo, PDF submission) | 40 per 10 min per user |
| Assignment submissions | 30 per 10 min per user |
| AI question generation (quiz + assignment, shared) | 15 per 10 min per user |
| Chatbot | 20 per minute per user (as before) |
| Everything under /api | 300 per minute per IP |
- All limits answer HTTP 429 with a clear English message.
- Behind a proxy (Render etc.) set `NODE_ENV=production` (or `TRUST_PROXY=1`) so each visitor is counted by their own IP, not the proxy's.
- Counters are in server memory (resets on restart; use Redis if you ever run several servers).
- `RATE_LIMIT_DISABLED=true` turns all limiters off - only for automated tests.

## Update — Security hardening (full audit fixes)
**Course permissions**
- Only a teacher (role educator/admin) can create courses. Only the course's owner (or an admin) can edit / delete a course, add / edit / delete its lectures, upload its files. Checked BEFORE any upload is accepted.
- Quiz / assignment teacher actions already had owner checks (unchanged).

**Paid content is no longer public**
- `GET /api/course/getpublishedcoures` (and `getcourse`): visitors and non-enrolled students only get lecture TITLES plus the video of lectures marked "free preview". Videos, study materials and other students' ids are only for the teacher, admins and enrolled students.
- `getcourselecture`: owner / admin / enrolled students only (403 otherwise).
- Unpublished courses are visible only to their teacher and admins; you cannot enroll in them. `getcreator` returns only name / bio / photo / role. Free-enroll no longer returns the user record.

**Payments (switched OFF until you set up Razorpay)**
- `/api/payment/*` needs login and returns 503 "Online payments are not enabled yet" unless `RAZORPAY_ENABLED=true` in `.env`.
- Already built for when you enable it: Razorpay signature check, order tied to course + user (order notes), amount taken from the database, order must be "paid", one payment = one enrollment (unique `paymentOrderId`), the user comes from the login (not the request body). Tested with a fake Razorpay; still do a real test-mode payment before going live.

**Uploads**
- Random server-side file names, per-field type whitelist (images / video / pdf & office docs), size limits (photo + thumbnail 5 MB, submissions 25 MB, study material 25 MB, lecture video 500 MB), content ("magic bytes") check, and the temp file is always removed.

**Other**
- Lecture progress / XP / streaks only count for enrolled students and real lectures of that course.
- Reviews need enrollment; teachers cannot review their own course.
- Security headers (helmet), no `X-Powered-By`, internal error text never reaches the browser (bad ids -> 400, broken JSON -> 400), `JWT_SECRET` shorter than 32 chars prints a warning at startup.
- Login says "Incorrect email or password" for both unknown email and wrong password; forgot-password answers the same for unknown emails.
- Account pre-hijack: if someone registers a password for an email they don't own and the real owner later signs in with Google, the unverified password is removed, old sessions are signed out and the owner is told (they can set a new password with Forgot password). Existing password users who sign in with Google for the first time get the same one-time notice.
- `.gitignore` added (keeps `.env` out of git). `.env.example` files show every setting. `npm audit fix` applied; what remains: `nodemailer` (needs a major upgrade) and Firebase's unused Firestore parts (npm only offers a downgrade).

## Update — Security round 2
- Logout is now `POST /api/auth/logout` (was GET), so another website can't log someone out with an image tag. The frontend (Nav) uses the new call.
- CSRF defence: any POST/PUT/DELETE that carries an `Origin` header from a site that is not in `CLIENT_URLS` is refused with 403 (covers form posts and file uploads when cookies are `SameSite=None` in production). Remember to put your deployed frontend URL in `CLIENT_URLS`.
- Password rule (signup + reset): 8-72 characters, at least one letter and one number, not a very common password (bcrypt ignores anything after 72 characters).
- `nodemailer` upgraded to the latest major (the last high-severity backend package).
- Still on YOUR side: replace `JWT_SECRET` with a 64+ character random value, set `CLIENT_URLS` + `NODE_ENV=production` when you deploy, finish the Firebase console setup, and do a real Razorpay test-mode payment before setting `RAZORPAY_ENABLED=true`.

---

## Security round 3 – private lecture media, honest upload errors, quieter login

**Private lecture videos / notes (switch, OFF by default).** With `PRIVATE_MEDIA=true` in `backend/.env`, new lecture videos and study materials are stored on Cloudinary as *authenticated* assets (no public URL). The database keeps only a marker, and the browser gets `/api/media/lecture/<id>/video` or `/resource/<id>`, which checks on every request that the user is the teacher, an admin or an enrolled student (free-preview videos are open to everyone). The server streams the file from Cloudinary (Range supported, so seeking works) and never reveals the Cloudinary address. A copied link therefore does not work for anyone who is not enrolled/logged in. Note: video bandwidth now flows through the backend server.
To also protect lectures uploaded earlier: back up the DB, then `node scripts/makeMediaPrivate.js` (dry run) and `node scripts/makeMediaPrivate.js --apply`. Test with one lecture on real Cloudinary first (this part could not be tested against the real service in development; it is covered by automated tests with a fake Cloudinary).

**Upload errors.** If Cloudinary refuses a file (wrong key, file too big - free plan max 100 MB per video) the teacher now gets an error with the reason and nothing is saved, instead of a false "Lecture Updated".

**Login popups.** Login shows only "Login successful" / "Login not successful". Logged-out visitors no longer get a "user doesn't have token" popup; protected routes answer 401 "Please log in to continue." and background loads stay silent.

**Teacher lecture list + player speed.** Each lecture in the teacher's lecture list shows badges (Video uploaded / No video yet, N notes / No notes, Free preview). The student player has speed buttons (0.5x–2x, remembered in the browser) and keyboard shortcuts: Space play/pause, ← → 5 seconds, `<` `>` speed.

**Reload fix.** The app now waits until the server has answered "who is logged in?" before it decides which page to show, so reloading a protected page (e.g. a lecture) while logged in no longer bounces to /signup.

---

## Note Summarizer (AI)

Each study material (PDF, Word .docx, PowerPoint .pptx, text) has a **Summarize** button on the lecture page. It shows a short summary, key points, important terms and practice questions.

- **Who:** only the teacher, admins and enrolled students (same rule as opening the file). Endpoint: `POST /api/ai/summarize-note` `{ lectureId, resourceId }`.
- **How:** the server fetches the file (private or public Cloudinary), extracts the text (pdf-parse / mammoth / unzip of the pptx XML), and asks Gemini for a fixed JSON answer. A scanned PDF with no text layer, or a PDF the text reader cannot parse, is sent to Gemini as the PDF itself.
- **Cached:** the summary is stored with the note (`resources[].summary`), so it is made once and every student gets it instantly. Only the teacher/admin can press Regenerate. Removing the note removes its summary. Two students asking at once cost one AI call.
- **Safety:** the note text is wrapped as data between markers and the model must answer in a fixed shape; only the expected fields are kept (lengths capped), so instructions hidden inside a note cannot change what is shown. Files over 12 MB, files with no readable text, old .doc/.ppt, and non-study files get a clear message. Limit: 20 summary requests per user per 10 minutes. The file address must be Cloudinary - nothing else is ever fetched.
- **Needs:** `npm install` (new packages `mammoth`, `jszip`) and the normal `GEMINI_API_KEY`. Optional `SUMMARY_AI_TIMEOUT_MS` (default 60000).
- Tested with a fake Gemini (43 automated checks + browser test). Real Gemini output quality was not testable in development.

---

## Final security + signup release (email OTP via Brevo, forgot password, hardening)

### 1. Email verification at sign-up (Brevo)
- Sign-up now saves the account as **unverified**, mails a 6-digit code and returns `{needsVerification:true}`. **No login cookie** until the code is entered (`POST /api/auth/verify-email`). `POST /api/auth/resend-email-otp` has a 60 s cooldown.
- Codes: 10 min expiry, 5 wrong tries lock it, stored as **HMAC-SHA256** (secret `OTP_SECRET`, falls back to `JWT_SECRET`) bound to purpose + email, compared with `timingSafeEqual`. A sign-up code cannot be used as a reset code.
- Login of an unverified account -> 403 `EMAIL_NOT_VERIFIED` (+ a new code is mailed). **Accounts created before this release verify on their next login.**
- Typo domains (`gmil.com` -> suggests `gmail.com`), disposable domains and domains with no mail server (DNS MX/A) are refused at sign-up. DNS trouble on our side never blocks a real user (fail-open).
- Mail goes through **Brevo's HTTPS API** (`BREVO_API_KEY`); Gmail/nodemailer is only a fallback. If Brevo fails the user sees a friendly 503 and can press "Resend code"; the key is never logged or returned.

### 2. Forgot password
- Wrong password on the login page shows **"Forgot your password? Reset it"** (opens the reset page with the email prefilled). Reset uses the same HMAC OTP, is single-use, signs out all old sessions, and answers identically for unknown emails.

### 3. Other fixes in this release
- Assignment PDFs are stored **private** (`PRIVATE_ASSIGNMENT_FILES=true` default) and opened only via `/api/media/submission/:id/file` (owner student / course teacher / admin). No Cloudinary or marker URL appears in any API response (the submit response leak found during final testing is fixed).
- Review/marks validation: final marks 0..maxMarks, per-question marks 0..question max, feedback length limits, nothing saved unless everything is valid.
- Quiz validation (teacher input, AI-generated JSON, attempt answers/time); draft quizzes cannot be attempted.
- Start-up: server exits if MongoDB is unreachable; in production a JWT_SECRET shorter than 32 chars refuses to start.
- Deleting a course/user now cascades (lectures + Cloudinary files, quizzes, attempts, assignments, submissions, progress, reviews). A teacher's course that still has enrolled students is **archived** (hidden from the catalogue, enrolled students keep access) instead of deleted. Payment records (Order/Enrollment) are always kept. Leaderboards/reviews/submission lists no longer crash on deleted users.

### 4. New environment variables
`BREVO_API_KEY`, `MAIL_FROM_EMAIL` (must be a verified sender in Brevo), `MAIL_FROM_NAME`, `REQUIRE_EMAIL_VERIFICATION=true`, `OTP_SECRET`, `EMAIL_MX_CHECK=true`, `PRIVATE_MEDIA=false`, `PRIVATE_ASSIGNMENT_FILES=true`, `SUMMARY_AI_TIMEOUT_MS` (optional). See `backend/.env.example`.

### 5. Migration (always backup -> dry-run -> apply). Backups go to `backend/backups/`.
```
cd backend
node scripts/cleanOrphans.js              # dry run: lists orphans left by old deletes
node scripts/cleanOrphans.js --apply      # writes a backup first, then cleans
node scripts/makeSubmissionsPrivate.js            # dry run
node scripts/makeSubmissionsPrivate.js --apply    # backup, then moves old public PDFs to private
node scripts/makeMediaPrivate.js [--apply]        # optional: lecture videos/notes private
```
Take a MongoDB backup (mongodump) before `--apply`. These scripts never touch Order/Enrollment.

### 6. API testing steps (curl)
1. `POST /api/auth/signup` -> expect 201 `needsVerification`, no cookie. 2. Read the code from the email. 3. `POST /api/auth/verify-email {email,otp}` -> 200 + cookie. 4. Wrong code x5 -> 429. 5. `POST /api/auth/login` with wrong password -> 400 (UI shows the forgot link). 6. `POST /api/auth/sendotp`, `/verifyotp`, `/resetpassword`. 7. Submit a PDF assignment, then open the returned `/api/media/submission/:id/file` as owner (200), other student (403), visitor (401).

### 7. Remaining risks (be honest)
- Real **Brevo**, **Cloudinary** and **Gemini** were tested only against fakes. Do one real signup mail, one real PDF submit/open and one real delete before going live. The Brevo sender address must be verified in your Brevo account or mails are rejected.
- Rate limits are in-memory: fine for one server instance; use Redis if you run 2+ instances.
- Unverified accounts are not auto-purged. Private PDFs/videos stream through the backend (bandwidth). `PRIVATE_MEDIA` for lecture videos is still OFF by default.
- Set `NODE_ENV=production`, a 64+ char `JWT_SECRET` and `CLIENT_URLS` in production.
