# Sounds

Drop **CC0** MP3 files into this folder with the exact filenames below.
The game looks for these paths at runtime; if a file is missing Howler
silently skips it, so the game keeps working (just without audio for
that event).

| Filename          | When it plays                          | Suggested feel                                  |
| ----------------- | -------------------------------------- | ----------------------------------------------- |
| `reel-spin.mp3`   | Loops while the reels are spinning.    | Soft whir / clicks — short loop, under ~2 s.    |
| `win.mp3`         | Any win below 50× total bet.           | Quick upbeat chime, ~0.8 s.                     |
| `big-win.mp3`     | Wins ≥ 50× total bet.                  | Fanfare / swell, ~1.5 s.                        |
| `bonus.mp3`       | 3+ scatters trigger the bonus wheels.  | Celebratory ding / flourish, ~1 s.              |

Good CC0 sources:

- [Freesound CC0](https://freesound.org/search/?f=license:%22Creative+Commons+0%22)
- [OpenGameArt](https://opengameart.org/) — filter by "CC0".
- [Pixabay](https://pixabay.com/sound-effects/) — check the license on each clip.

Notes:

- Keep files small (ideally under 50 KB each) so the page stays quick to
  load on mobile.
- MP3 is the safest format across browsers. If you want OGG/WebM as a
  fallback, add the path as a second entry in `SOUND_FILES` in `game.js`
  and Howler will pick whichever the browser supports.
- The mute button in the top-left corner toggles all audio. Mute state
  persists in `localStorage` under the key `slot_muted`.
