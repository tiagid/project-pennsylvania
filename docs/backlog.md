# Product backlog

Updated Oct 13, 2026 to match the Project Design and Plan presentation. Changes since Module 5: phone support moved to Must Have and re-pointed from 55 to 13 since we're designing for phones first; added US-14 (login), US-15 (My Songs), and US-16 (sheet music).

Points come from planning poker (1, 2, 3, 5, 8, 13, 21, 34, 55). Total: 183 points over 2 sprints, so velocity is about 92 points per sprint. Capacity is 3 people x 6 hrs/week x 3 weeks = 54 hours per sprint.

| # | Story | MoSCoW | Pts | Sprint |
|---|-------|--------|-----|--------|
| 1 | US-1 Upload audio (WAV, MP3, M4A) | Must | 5 | 1 |
| 2 | US-12 Works on a phone | Must | 13 | 1 |
| 3 | US-3 Transcribe (basic-pitch) | Must | 21 | 1 |
| 4 | US-7 Download the .mid | Must | 5 | 1 |
| 5 | US-14 Account and login | Must | 8 | 1 |
| 6 | US-5 Falling notes / piano roll | Must | 13 | 2 |
| 7 | US-6 Play back the MIDI | Must | 8 | 2 |
| 8 | US-15 My songs | Must | 8 | 2 |
| 9 | US-8 Set tempo | Must | 5 | 2 |
| 10 | US-4 Progress bar | Should | 3 | 2 |
| 11 | US-2 Record from mic | Should | 21 | 2 |
| 12 | US-9 Choose instrument | Should | 8 | 2 |
| 13 | US-11 Tempo and key detection | Should | 21 | 2 |
| 14 | US-10 Chords (Phase 2) | Should | 21 | 2 |
| 15 | US-16 Sheet music (Phase 2) | Should | 21 | 2 |
| 16 | US-13 Explain the app | Could | 2 | 1 |

## Sprint 1 (54 points)

Goal: upload a voice memo on your phone and get a MIDI back.

US-1, US-12, US-3, US-7, US-14, US-13. Lighter than velocity since setup takes time.

Deadlines from the Sprint 0 retrospective: issues and backlog update by Oct 17, basic-pitch speed test on Render by Oct 24, full upload-to-MIDI flow and Supabase by Oct 28.

## User stories

US-1, US-2 Record or upload. As a musician, I want to record in the site or upload a voice memo so I can get it transcribed right away. Done when WAV, MP3, and M4A up to 3 minutes work, and anything else gets a clear message.

US-3 Transcribe. As a music student, I want my playing turned into notes so I don't have to do it by ear. Done when every note has a pitch, start, length, and volume, and silence doesn't make notes.

US-5 Falling notes. As a beginner pianist, I want to see my song as falling blocks so I can learn it without sheet music. Done when notes scroll with playback and I can switch to a piano roll.

US-14, US-15 Account and My Songs. As a musician, I want my songs saved to my account so I can come back to them anytime. Done when I can log in and see my songs with title and date.
