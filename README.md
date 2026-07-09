# Smart Display

A simple static smart display for a Chromebook, designed for GitHub Pages.

It shows:

- an OxonTime bus page in an iframe
- a top-row date and flip-clock time display with seconds
- sunrise, sunset, and daylight remaining with a sun-arc visual
- current conditions and a five-day forecast from a weather API
- today's selected calendar events from a generated JSON snapshot
- an hourly rotating Flickr photo in its own iframe
- hourly page colors matched to the photo via the Sanzo Wada color list

## Local Preview

Run a local static server from this folder:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Configure The Display

Edit `config.js`.

- `location`: set the display label, latitude, longitude, and timezone.
- `bus.frameUrl`: set the exact OxonTime page or stop display URL you want in the iframe.
- `bus.scale`: scales the embedded bus page. `0.375` renders the current timetable crop 50% larger than the previous quarter-size view.
- `bus.crop`: clips the embedded page to the black departures table so the white OxonTime page background and iframe scrollbars are hidden.
- `calendar.eventsUrl`: leave as `data/events.json` if using the GitHub Actions updater.
- `flickr.userId`: defaults to the `drcphotography` Flickr stream NSID, `40979668@N08`.
- `flickr.tags`: optionally filter that Flickr public feed by tags.
- `flickr.refreshMinutes`: defaults to `60`, so the selected photo changes hourly.
- `theme.colorsUrl`: defaults to the Sanzo Wada colors JSON and picks the closest readable palette from the current photo.

If the OxonTime page refuses to load in an iframe, some third-party security header is blocking embedding, and a static site cannot override that.

## Calendar Data

Do not put calendar tokens, private iCal links, or API keys in client-side JavaScript. GitHub Pages serves this repository publicly.

The included workflow reads a private iCal URL from a repository secret and writes only the filtered display events to `data/events.json`.

1. In GitHub, add a repository secret named `CALENDAR_ICS_URL`.
2. Set `DISPLAY_TIMEZONE` as a repository variable, for example `Europe/London`.
3. Optionally set `EVENT_KEYWORDS` as a comma-separated variable to show only matching event titles or locations.
4. Optionally set `MAX_EVENTS`, `FLICKR_TAGS`, `FLICKR_USER_ID`, or `FLICKR_FEED_URL`.
5. Run the `Update display data` workflow once, then let the 30-minute schedule keep it fresh.

The updater supports one-off events plus common daily, weekly, monthly, and yearly recurrence rules. For complex calendar rules, use a dedicated display calendar so the exported events stay simple and intentional.

## GitHub Pages

Push this repository to GitHub, then enable Pages:

1. Open repository `Settings`.
2. Go to `Pages`.
3. Set source to `Deploy from a branch`.
4. Select the `main` branch and `/ (root)`.

The URL will normally be `https://<user>.github.io/<repo>/`.

## Security Considerations

- Treat the GitHub Pages URL as public. Anyone with the URL can see rendered weather, bus info, Flickr photos, and generated calendar events.
- Use a dedicated display calendar or keyword-filtered events. Do not publish sensitive appointments, exact home routines, private notes, or locations.
- Store the private iCal URL only as the `CALENDAR_ICS_URL` GitHub Actions secret. Rotate that URL if it is ever exposed.
- The generated `data/events.json` is public. The secret stays private, but event titles and times in the snapshot do not.
- Prefer HTTPS iframe URLs. Browser mixed-content rules will block insecure `http://` frames on GitHub Pages.
- The runtime Flickr fallback uses JSONP, which loads a script from Flickr. For a tighter security posture, rely on the GitHub Actions-generated `data/photos.json` and set `flickr.runtimeFeed` to `false`.
- Photo-based color matching uses browser canvas sampling. If a photo host blocks cross-origin sampling, the display falls back to an hourly readable Sanzo Wada palette.
- GitHub Pages does not provide built-in access control. For a private display, put a reverse proxy with authentication in front of it or host somewhere that supports access rules.
- Keep the Chromebook in a locked-down profile or kiosk mode, keep ChromeOS updated, and avoid signing into personal accounts on the display profile.
