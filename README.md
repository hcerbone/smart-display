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

```
python3 -m http.server 4173
```

Open _:root_ {
  _--page-background_: #1f2937;
  _--panel_: _rgba_(10, 16, 24, 0.74);
  _--panel-strong_: _rgba_(10, 16, 24, 0.86);
  _--line_: _rgba_(255, 255, 255, 0.16);
  _--text_: #f8fafc;
  _--muted_: _rgba_(248, 250, 252, 0.74);
  _--soft_: _rgba_(248, 250, 252, 0.58);
  _--accent_: #65d6ad;
  _--warn_: #f8c76f;
  _--bus-frame-scale_: 0.7;
  _--bus-crop-width_: 552px;
  _--bus-crop-height_: 213px;
  _--bus-source-width_: 1600px;
  _--bus-source-height_: 900px;
  _--bus-crop-offset-x_: 0px;
  _--bus-crop-offset-y_: 58px;
  _--photo-frame-width_: 100%;
  _--photo-frame-height_: 100%;
  _--top-row-font-size_: _clamp_(2.7rem, 5.8vw, 6.1rem);
  color-scheme: dark;
  font-family:
    "Bahnschrift", "Bahnschrift SemiCondensed", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

- {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: _var_(_--page-background_);
  color: _var_(_--text_);
  overflow: hidden;
}

a {
  color: inherit;
}

iframe {
  border: 0;
  outline: 0;
}

_.display-shell_ {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 18px;
  width: 100vw;
  height: 100vh;
  padding: 22px;
}

_.top-bar_,
_.display-grid_,
_.panel_ {
  min-width: 0;
}

_.top-bar_ {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

_.label_ {
  margin: 0 0 5px;
  color: _var_(_--accent_);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

_.date-line_,
_.panel-status_ {
  margin: 0;
  color: _var_(_--soft_);
}

_.date-line_ {
  color: _var_(_--text_);
  font-size: _var_(_--top-row-font-size_);
  font-weight: 850;
  line-height: 0.9;
  white-space: nowrap;
}

_.clock_ {
  margin: 0;
  font-size: _var_(_--top-row-font-size_);
  font-weight: 850;
  line-height: 0.9;
  letter-spacing: 0;
}

_.flip-clock_ {
  display: flex;
  align-items: center;
  gap: 0.055em;
  perspective: 900px;
  white-space: nowrap;
}

_.flip-unit_ {
  position: relative;
  display: grid;
  place-items: center;
  width: 0.64em;
  height: 0.96em;
  overflow: hidden;
  border: 1px solid _var_(_--line_);
  border-radius: 0.08em;
  background: _var_(_--panel-strong_);
}

_.flip-unit::after_ {
  content: "";
  position: absolute;
  inset: 50% 0 auto;
  height: 1px;
  background: _rgba_(0, 0, 0, 0.34);
}

_.flip-card_ {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  font-variant-numeric: tabular-nums;
  font-size: 0.86em;
  line-height: 1;
  text-align: center;
}

_.flip-card.is-flipping_ {
  animation: flip-tick 360ms _cubic-bezier_(0.2, 0.75, 0.25, 1);
}

_.flip-separator_ {
  display: inline-flex;
  align-items: center;
  height: 0.96em;
  padding: 0 0.01em;
  line-height: 0.9;
}

@keyframes _flip-tick_ {
  0% {
    transform: _rotateX_(0deg);
  }

  48% {
    transform: _rotateX_(-82deg);
  }

  52% {
    transform: _rotateX_(82deg);
  }

  100% {
    transform: _rotateX_(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  _.flip-card.is-flipping_ {
    animation: none;
  }
}

_.display-grid_ {
  display: grid;
  grid-template-columns:
    _minmax_(0, 552px)
    _repeat_(11, _minmax_(0, 1fr));
  grid-template-rows: _var_(_--bus-crop-height_) _minmax_(0, 1fr);
  gap: 18px;
  align-items: stretch;
  min-height: 0;
}

_.bus-panel_ {
  grid-column: 1 / 2;
  grid-row: 1;
  width: 100%;
  height: _var_(_--bus-crop-height_);
}

_.sun-panel_ {
  grid-column: 2 / 7;
  grid-row: 1;
  justify-self: stretch;
  width: auto;
  min-width: 0;
  height: _var_(_--bus-crop-height_);
  border: 0;
  gap: 10px;
  overflow: hidden;
  backdrop-filter: none;
  background: transparent;
}

_.panel_ {
  display: flex;
  min-height: 0;
  border: 1px solid _var_(_--line_);
  border-radius: 8px;
  background: _var_(_--panel_);
  backdrop-filter: _blur_(12px);
}

_.bus-panel_,
_.sun-panel_,
_.today-weather-panel_,
_.weather-panel_,
_.calendar-panel_,
_.photo-panel_ {
  padding: 16px;
}

_.bus-panel_,
_.sun-panel_,
_.calendar-panel_,
_.photo-panel_ {
  flex-direction: column;
}

_.bus-panel_ {
  grid-column: 1 / 7;
  grid-row: 1;
  justify-self: start;
  width: _min_(_var_(_--bus-crop-width_), 100%);
  max-width: 100%;
  height: _var_(_--bus-crop-height_);
  border: 0;
  padding: 0;
  overflow: hidden;
  background: #000;
  backdrop-filter: none;
}

_.sun-panel_ {
  _--sun-x_: 50%;
  _--sun-y_: 18%;
  _--sun-progress-percent_: 50%;
  _--sun-progress-width_: 41%;
  position: relative;
  grid-column: 1 / 7;
  grid-row: 1;
  min-width: 0;
  height: _var_(_--bus-crop-height_);
  border: 0;
  gap: 10px;
  overflow: hidden;
  backdrop-filter: none;
  background: transparent;
}

_.sun-visual_ {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 112px;
  overflow: visible;
  background: transparent;
}

_.sun-arc_ {
  position: absolute;
  right: 9%;
  bottom: 18%;
  left: 9%;
  height: 92%;
  border-top: 2px dashed currentColor;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  opacity: 0.5;
}

_.sun-progress_ {
  position: absolute;
  bottom: _calc_(18% - 1px);
  left: 9%;
  width: _var_(_--sun-progress-width_);
  max-width: 82%;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.62;
}

_.sun-horizon_ {
  position: absolute;
  right: 8%;
  bottom: 18%;
  left: 8%;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.48;
}

_.sun-dot_ {
  position: absolute;
  left: _var_(_--sun-x_);
  top: _var_(_--sun-y_);
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: currentColor;
  transform: _translate_(-50%, -50%);
}

_.sun-dot::before_ {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  border: 2px dotted currentColor;
  opacity: 0.42;
}

_.sun-panel.is-night_ _.sun-dot_ {
  opacity: 0.35;
}

_.sun-times_ {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: _minmax_(max-content, 0.85fr) _minmax_(max-content, 1.3fr) _minmax_(max-content, 0.85fr);
  gap: 6px;
}

_.sun-times_ p {
  margin: 0;
  min-width: 0;
}

_.sun-times_ strong {
  display: block;
  color: _var_(_--text_);
  font-size: _clamp_(1rem, 1.35vw, 1.3rem);
  line-height: 1;
  white-space: nowrap;
  text-align: center;
}

_.sun-remaining_ strong {
  color: _var_(_--accent_);
}

_.weather-panel_ {
  grid-column: 9 / -1;
  grid-row: 1;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 0;
  background: transparent;
  backdrop-filter: none;
}

_.weather-panel_ _.panel-heading_ {
  margin-bottom: 6px;
}

_.weather-panel_ h2 {
  font-size: _clamp_(1.3rem, 1.85vw, 1.75rem);
}

_.weather-panel_ h2_:empty_ {
  display: none;
}

_.weather-panel_ _.panel-status_ {
  min-height: auto;
  padding-top: 0;
  font-size: 0.72rem;
}

_.weather-panel_ _.panel-status:empty_ {
  display: none;
}

_.today-weather-panel_ {
  grid-column: 7 / 9;
  grid-row: 1;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  backdrop-filter: none;
}

_.today-weather-panel_ iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

_.calendar-panel_ {
  grid-column: 1 / 4;
  grid-row: 2;
}

_.photo-panel_ {
  display: grid;
  grid-column: 4 / -1;
  grid-row: 2;
  grid-template-rows: _minmax_(0, 1fr) auto;
  place-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  backdrop-filter: none;
}

_.photo-panel_ iframe {
  display: block;
  width: _min_(_var_(_--photo-frame-width_), 100%);
  height: _min_(_var_(_--photo-frame-height_), 100%);
  border: 0;
  background: #000;
}

_.photo-caption_ {
  max-width: 100%;
  margin: 0;
  padding: 0 8px 6px;
  color: _var_(_--text_);
  font-size: _clamp_(0.82rem, 1.05vw, 1rem);
  font-weight: 700;
  line-height: 1;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

_.panel-heading_ {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

h1,
h2 {
  margin: 0;
  line-height: 1.05;
  letter-spacing: 0;
}

h1 {
  font-size: _clamp_(1.55rem, 2.4vw, 2.35rem);
}

h2 {
  font-size: _clamp_(1.35rem, 2vw, 1.8rem);
}

_.external-link_ {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  min-height: 36px;
  border: 1px solid _var_(_--line_);
  border-radius: 8px;
  background: _rgba_(255, 255, 255, 0.08);
  color: _var_(_--text_);
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
}

_.external-link:focus-visible_ {
  outline: 3px solid _var_(_--accent_);
  outline-offset: 2px;
}

_.bus-frame-viewport_ {
  flex: 0 0 auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

_.bus-frame-viewport_ iframe {
  display: block;
  width: _var_(_--bus-source-width_);
  height: _var_(_--bus-source-height_);
  border: 0;
  background: #f8fafc;
  overflow: hidden;
  transform: _scale_(_var_(_--bus-frame-scale_))
    _translate_(
      _calc_(-1 * _var_(_--bus-crop-offset-x_)),
      _calc_(-1 * _var_(_--bus-crop-offset-y_))
    );
  transform-origin: top left;
}

_.panel-status_ {
  min-height: 1.35rem;
  padding-top: 10px;
  font-size: 0.86rem;
}

_.weather-temp_ {
  margin: 0;
  color: _var_(_--text_);
  font-size: _clamp_(2.2rem, 4vw, 3.7rem);
  font-weight: 850;
  line-height: 0.9;
}

_.forecast-list_ {
  display: grid;
  grid-template-columns: _repeat_(5, _minmax_(0, 1fr));
  gap: 8px;
  flex: 1;
  margin: 0;
  min-height: 0;
  padding: 0;
  list-style: none;
}

_.forecast-list_ li {
  display: grid;
  grid-template-rows: auto _minmax_(0, 1fr) auto auto;
  align-items: center;
  margin: 0;
  min-height: 0;
  padding: 8px 7px;
  border: 0;
  border-radius: 8px;
  background: transparent;
}

_.forecast-day_,
_.forecast-rain_ {
  margin: 0;
  color: _var_(_--muted_);
  font-weight: 700;
}

_.forecast-day_ {
  font-size: _clamp_(1.08rem, 1.35vw, 1.3rem);
  line-height: 1;
}

_.forecast-rain_ {
  font-size: _clamp_(0.9rem, 1.05vw, 1.05rem);
  line-height: 1;
}

_.forecast-icon_ {
  align-self: center;
  margin: 0;
  font-size: _clamp_(2.3rem, 4.4vw, 3.3rem);
  line-height: 0.9;
}

_.forecast-temps_ {
  margin: 0 0 3px;
  font-size: _clamp_(1.08rem, 1.35vw, 1.28rem);
  font-weight: 850;
  line-height: 1;
}

_.event-count_ {
  display: grid;
  place-items: center;
  min-width: 44px;
  height: 44px;
  margin: 0;
  border-radius: 50%;
  background: _rgba_(101, 214, 173, 0.16);
  color: _var_(_--accent_);
  font-size: 1.25rem;
  font-weight: 850;
}

_.event-list_ {
  display: grid;
  gap: 10px;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

_.event-list_ li {
  padding: 12px;
  border: 1px solid _var_(_--line_);
  border-radius: 8px;
  background: _var_(_--panel-strong_);
}

_.event-time_ {
  margin: 0 0 4px;
  color: _var_(_--warn_);
  font-size: 0.82rem;
  font-weight: 800;
}

_.event-title_ {
  margin: 0;
  font-size: _clamp_(1rem, 1.35vw, 1.2rem);
  font-weight: 800;
  line-height: 1.18;
}

_.event-location_ {
  margin: 5px 0 0;
  color: _var_(_--muted_);
  font-size: 0.88rem;
  line-height: 1.25;
}

noscript {
  position: fixed;
  z-index: 2;
  inset: auto 20px 20px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #7f1d1d;
  color: #fff;
}

@media (max-width: 900px) {
  body {
    overflow: auto;
  }

  _.display-shell_ {
    min-height: 100vh;
    height: auto;
  }

  _.display-grid_ {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  _.bus-panel_,
  _.sun-panel_,
  _.today-weather-panel_,
  _.weather-panel_,
  _.calendar-panel_,
  _.photo-panel_ {
    grid-column: 1;
    grid-row: auto;
  }

  _.bus-panel_ {
    height: _var_(_--bus-crop-height_);
  }

  _.sun-panel_ {
    width: 100%;
    height: _var_(_--bus-crop-height_);
  }

  _.photo-panel_ {
    height: 280px;
  }
}

@media (max-width: 620px) {
  _:root_ {
    _--top-row-font-size_: _clamp_(2.6rem, 14vw, 4rem);
  }

  _.display-shell_ {
    padding: 14px;
  }

  _.top-bar_ {
    align-items: start;
    flex-direction: column;
  }

  _.date-line_ {
    white-space: normal;
  }

  _.forecast-list_ {
    grid-template-columns: _repeat_(2, _minmax_(0, 1fr));
  }
}



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
