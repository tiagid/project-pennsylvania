#!/usr/bin/env bash
set -e
R=tiagid/project-pennsylvania

for l in "sprint-1:0E8A16" "story:1D76DB" "backend:5319E7" "frontend:FBCA04" "qa:D93F0B"; do
  gh label create "${l%%:*}" --color "${l##*:}" -R $R 2>/dev/null || true
done

mk() { gh issue create -R $R --title "$1" --label "$2" --body "$3"; }

mk "US-1: Upload audio (WAV, MP3, M4A)" "story,sprint-1,frontend" "## Story
As a musician, I want to upload a voice memo or audio file so I can get it transcribed right away.

## Owner
Vincent (frontend), Brady (upload endpoint)

## Story points
5

## Acceptance criteria
- [ ] WAV, MP3, and M4A files up to 3 minutes upload from the site
- [ ] Any other file type or a file over 3 minutes gets a clear error message
- [ ] The file reaches POST /transcribe on the FastAPI server

## Definition of Done
- [ ] Merged through a reviewed PR
- [ ] CI passes
- [ ] Tested on a phone"

mk "US-12: Works on a phone" "story,sprint-1,frontend" "## Story
As a musician recording on my phone, I want the site to work on my phone so I don't need a computer.

## Owner
Vincent

## Story points
13

## Acceptance criteria
- [ ] React site deployed on Vercel and loads on iPhone and Android (deadline Oct 17)
- [ ] Upload flow is usable one-handed on a phone screen
- [ ] Nothing breaks on a laptop browser either

## Definition of Done
- [ ] Merged through a reviewed PR
- [ ] CI passes
- [ ] Tested on iPhone and Android"

mk "US-3: Transcribe audio to notes (basic-pitch)" "story,sprint-1,backend" "## Story
As a music student, I want my playing turned into notes so I don't have to do it by ear.

## Owner
Brady

## Story points
21

## Acceptance criteria
- [ ] backend/transcribe.py exposes audio_to_notes(path) and audio_to_midi(path, out_path) and passes backend/tests/test_transcribe.py
- [ ] Every note has a pitch, start, length, and velocity
- [ ] Silence does not produce notes
- [ ] A 3 minute clip transcribes in under 60 seconds on Render, or a backup plan is written down (deadline Oct 24)

## Definition of Done
- [ ] Merged through a reviewed PR
- [ ] CI passes"

mk "US-7: Download the .mid file" "story,sprint-1,frontend,backend" "## Story
As a musician, I want to download the MIDI so I can drag it into my DAW.

## Owner
Vincent (download button), Brady (server returns the file)

## Story points
5

## Acceptance criteria
- [ ] After transcription the site shows a download button for the .mid
- [ ] The file opens in GarageBand or Logic
- [ ] Full flow works: voice memo uploaded from a phone comes back as a .mid (deadline Oct 28)

## Definition of Done
- [ ] Merged through a reviewed PR
- [ ] CI passes
- [ ] Tested on a phone"

mk "US-14: Account and login (Supabase)" "story,sprint-1,backend,frontend" "## Story
As a musician, I want to log in so my songs are saved to my account.

## Owner
Brady and Vincent

## Story points
8

## Acceptance criteria
- [ ] Supabase project created with auth and a songs table (title, date, BPM)
- [ ] Login works from the React site
- [ ] The site can read and write to the songs table (deadline Oct 28)
- [ ] No Supabase keys committed to the repo

## Definition of Done
- [ ] Merged through a reviewed PR
- [ ] CI passes"

mk "US-13: Explain the app" "story,sprint-1,frontend,qa" "## Story
As a first-time visitor, I want a short explanation of what the app does so I know what to upload.

## Owner
Daniel

## Story points
2

## Acceptance criteria
- [ ] Landing page has two or three sentences explaining upload, transcribe, and download
- [ ] Lists the accepted formats and the 3 minute limit

## Definition of Done
- [ ] Merged through a reviewed PR"
