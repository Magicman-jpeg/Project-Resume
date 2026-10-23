# Background music

Drop your own audio file here to use it as the site's background music.

## Quick start

1. Add your file to this folder named exactly:

   ```
   assets/audio/track.mp3
   ```

   (On GitHub you can use **Add file → Upload files** and drop it into this folder.)

2. Commit / push. That's it — the player on the site will play it on a loop.

## Notes

- **Off by default.** The music never autoplays; a visitor has to press play.
  Volume and on/off are remembered between visits.
- **Use your own / licensed audio only.** Only upload music you have the right
  to use (your own, royalty-free, or properly licensed).
- **No file?** If `track.mp3` is missing, the player automatically falls back
  to a soft, generated ambient tone, so nothing breaks.
- **Different name or an external URL?** Set `data-src` on the player element
  in `index.html`, e.g.:

  ```html
  <div id="music-player" ... data-src="assets/audio/my-song.mp3">
  ```

  Comma-separate multiple fallbacks (e.g. mp3 + ogg):

  ```html
  data-src="assets/audio/song.mp3, assets/audio/song.ogg"
  ```
- **Track name ("now playing").** The player shows a name next to the controls.
  By default it's derived from the filename (e.g. `my-song.mp3` → "My Song").
  To set it explicitly, add `data-title` on the player element in `index.html`:

  ```html
  <div id="music-player" ... data-title="My Chill Mix">
  ```
- **Format.** `.mp3` is the safest cross-browser choice. `.ogg`/`.m4a` also work
  in most modern browsers.
- **Size.** Keep it reasonably small (a few MB) so the page stays quick to load.
