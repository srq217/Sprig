# Sprig — Netlify package

This contains the latest neon arcade design, all nine vocabulary words, teaching cards, pronunciation, solo quiz, and the classroom multiplayer game with game PINs, synchronized questions, scores, rankings, and the top-three podium.

## Updating an existing Netlify site

Replace public/index.html, lib/game.mjs, and lib/handler.mjs in your GitHub repository with these updated files, preserving their folders. Commit the changes; Netlify rebuilds automatically. No database migration is needed for this update. Create a NEW game after deploying: games already in progress retain their original question set.

Every new quiz now has exactly 15 questions: five definitions, five parts of speech, and five sentence-completion questions. Pronunciation remains available on teaching cards but is not tested.

## Start here

Extract the ZIP first. Deploy the whole project, not only public/index.html.

The classroom game needs Netlify Functions and Netlify Database. Netlify Database requires a credit-based Netlify plan and uses credits. Check your account's current limits before a classroom session. No Firebase or Supabase account or API key is needed for this package.

## Option A — Upload through GitHub (recommended)

1. Sign in to GitHub and create a new repository called vocablab-live. You may keep it private.
2. Inside that repository, choose Add file > Upload files. Upload the CONTENTS of the extracted vocablab-netlify folder, including lib, netlify, public, package.json, package-lock.json, netlify.toml, build.mjs, tests, and this guide. Commit the upload. Do not upload the ZIP itself or node_modules.
3. Sign in to Netlify. Choose Add new project / Import an existing project, connect GitHub, and select that repository.
4. Use the following settings (netlify.toml already supplies them):
   - Build command: npm run build
   - Publish directory: public
   - Functions directory: netlify/functions
   - Base directory: leave empty if the files are at the repository root.
5. Deploy. The @netlify/database dependency tells Netlify to provision its database. The SQL migration in netlify/database/migrations creates the room table during deployment.
6. Check Data & Storage > Database in Netlify. If automatic provisioning is unavailable for your account, create the database there, then trigger another deploy. A compatible Netlify plan is required.
7. Open the resulting HTTPS .netlify.app address and run the classroom check below.

## Option B — Deploy from your Windows computer

Install Node.js 22 or newer from https://nodejs.org/ and create/sign in to your Netlify account.

Extract the ZIP. Open the extracted vocablab-netlify folder in File Explorer. Type cmd in the address bar and press Enter. Run these commands one at a time:

    npm install
    npx netlify-cli login
    npx netlify-cli sites:create
    npx netlify-cli link
    npx netlify-cli deploy --build --prod

- login opens a browser for your own Netlify authorization.
- sites:create creates a project under your selected Netlify team. Choose a name you like.
- link connects this folder to that project; select the project you just created.
- deploy builds and publishes the frontend and backend together. Keep the netlify and lib folders present.
- Check Data & Storage > Database in the Netlify dashboard after publishing. If needed, provision the database there and repeat deploy --build --prod.

## Classroom check

1. On your laptop, open the new Netlify link and select Host the showdown.
2. Enter your host name and select Create room.
3. On a different phone/tablet, open EXACTLY the same Netlify address.
4. Choose Join your friends and enter the six-digit PIN and a nickname.
5. Confirm the nickname appears on the host's screen. Start the game.
6. Submit an answer from the phone. The host should see the answer count increase. Scores and the correct answer are revealed when all players answer or the timer finishes.
7. Complete the round and check the podium.

Students do not need Netlify accounts. All participants must use the same site deployment: the previous chatgpt.site address and your new Netlify address have separate rooms and databases. Existing rooms and scores are not migrated. Rooms expire after six hours.

## Why Netlify Drop is insufficient

Dropping only the public folder onto Netlify can show the design and solo quiz, but it does not install this project's function dependencies or provision and migrate its database. Use one of the full-project methods above for cross-device play.

## Files

- public/index.html — complete animated user interface, lessons and browser quiz code
- public/favicon.svg — site icon
- netlify/functions/game.mjs — /api/game function entrypoint
- lib/handler.mjs — Netlify/Postgres storage and request handling
- lib/game.mjs — authoritative game rules and scoring
- lib/words.mjs — vocabulary used by the multiplayer server
- netlify/database/migrations/0001_create_rooms.sql — Postgres room schema
- netlify.toml — deployment settings
- package.json and package-lock.json — dependency specification
- build.mjs — validates the static site during build
- tests/game.test.mjs — multiplayer logic/request tests with a simulated database

To change vocabulary, update both lib/words.mjs and the const words array inside public/index.html so solo/teaching and multiplayer remain consistent. Then redeploy.

## Troubleshooting

- “Classroom games are unavailable”: check Netlify Database provisioning and deploy/function logs; confirm the migration succeeded.
- “Room not found”: check the PIN, check that everyone uses the same URL, and create a new room if it expired.
- A blank or 404 API response: deploy the full project using the configured functions directory.
- No pronunciation: browser text-to-speech needs available English voices and a tap/click; available voices vary by device.
- Usage: live rooms poll roughly once every 0.8 seconds per device. Larger classes can consume considerable function/database credits. Review your Netlify limits.

Validation: build and regression tests pass, including 30 simultaneous simulated players, a complete 15-question game, duplicate answers, deadlines, score visibility, stale responses and solo-exit cleanup. The database was simulated for these tests. This package has not been deployed or tested against YOUR Netlify account or a live Netlify Postgres database.

Official references (checked October 9, 2026):
https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/
https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
https://docs.netlify.com/build/functions/overview/
https://docs.netlify.com/build/data-and-storage/netlify-database/
