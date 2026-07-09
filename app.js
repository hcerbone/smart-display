(function () {
  "use strict";

  const defaultConfig = {
    displayName: "Display",
    location: {
      label: "Oxford",
      latitude: 51.752022,
      longitude: -1.257677,
      timezone: "Europe/London"
    },
    bus: {
      title: "OxonTime",
      frameUrl: "https://oxontime.com/departure-single-page/943",
      scale: 0.7,
      crop: {
        width: 552,
        height: 213,
        offsetX: 0,
        offsetY: 58,
        sourceWidth: 1600,
        sourceHeight: 900
      }
    },
    calendar: {
      eventsUrl: "data/events.json",
      maxEvents: 6,
      emptyMessage: "No key events today"
    },
    flickr: {
      photosUrl: "data/photos.json",
      runtimeFeed: true,
      tags: [],
      userId: "",
      streamName: "",
      refreshMinutes: 60
    },
    theme: {
      colorsUrl: "https://sanzo-wada.dmbk.io/assets/colors.json",
      minContrast: 4.5
    }
  };

  const config = mergeConfig(defaultConfig, window.SMART_DISPLAY_CONFIG || {});
  const clockFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.location.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const elements = {
    displayName: document.getElementById("displayName"),
    dateLine: document.getElementById("dateLine"),
    clock: document.getElementById("clock"),
    busTitle: document.getElementById("busTitle"),
    busLink: document.getElementById("busLink"),
    busFrame: document.getElementById("busFrame"),
    busStatus: document.getElementById("busStatus"),
    sunPanel: document.getElementById("sunPanel"),
    sunriseTime: document.getElementById("sunriseTime"),
    sunsetTime: document.getElementById("sunsetTime"),
    daylightRemaining: document.getElementById("daylightRemaining"),
    weatherLocation: document.getElementById("weatherLocation"),
    weatherTitle: document.getElementById("weatherTitle"),
    todayWeatherFrame: document.getElementById("todayWeatherFrame"),
    weatherTemp: document.getElementById("weatherTemp"),
    weatherFeels: document.getElementById("weatherFeels"),
    weatherHigh: document.getElementById("weatherHigh"),
    weatherRain: document.getElementById("weatherRain"),
    weatherWind: document.getElementById("weatherWind"),
    weatherStatus: document.getElementById("weatherStatus"),
    forecastList: document.getElementById("forecastList"),
    calendarTitle: document.getElementById("calendarTitle"),
    eventCount: document.getElementById("eventCount"),
    eventList: document.getElementById("eventList"),
    calendarStatus: document.getElementById("calendarStatus"),
    photoPanel: document.querySelector(".photo-panel"),
    photoFrame: document.getElementById("photoFrame"),
    photoCaption: document.getElementById("photoCaption")
  };

  let photoAspectRatio = 1;
  let latestWeatherData = null;

  init();

  function init() {
    if (elements.displayName) {
      elements.displayName.textContent = config.displayName;
    }
    applyFallbackPalette();
    configureBus();
    updateClock();
    refreshWeather();
    refreshEvents();
    refreshPhoto();

    window.setInterval(updateClock, 1000);
    window.setInterval(refreshWeather, 15 * 60 * 1000);
    window.setInterval(refreshEvents, 5 * 60 * 1000);
    scheduleHourlyDisplayRefresh();
    window.addEventListener("resize", sizePhotoFrame);
  }

  function configureBus() {
    if (elements.busTitle) {
      elements.busTitle.textContent = config.bus.title;
    }

    if (!config.bus.frameUrl) {
      if (elements.busStatus) {
        elements.busStatus.textContent = "Set bus.frameUrl in config.js";
      }
      return;
    }

    elements.busFrame.src = config.bus.frameUrl;
    if (elements.busLink) {
      elements.busLink.href = config.bus.frameUrl;
    }
    setBusFrameCrop(config.bus);
  }

  function setBusFrameCrop(busConfig) {
    const scale = Math.min(Math.max(Number(busConfig.scale) || 1, 0.1), 1);
    const crop = busConfig.crop || {};
    const width = Math.max(Number(crop.width) || 400, 80);
    const height = Math.max(Number(crop.height) || 160, 60);
    const offsetX = Math.max(Number(crop.offsetX) || 0, 0);
    const offsetY = Math.max(Number(crop.offsetY) || 0, 0);
    const sourceWidth = Math.max(Number(crop.sourceWidth) || width / scale, width / scale);
    const sourceHeight = Math.max(Number(crop.sourceHeight) || height / scale, height / scale);

    document.documentElement.style.setProperty("--bus-frame-scale", String(scale));
    document.documentElement.style.setProperty("--bus-crop-width", `${width}px`);
    document.documentElement.style.setProperty("--bus-crop-height", `${height}px`);
    document.documentElement.style.setProperty("--bus-source-width", `${sourceWidth}px`);
    document.documentElement.style.setProperty("--bus-source-height", `${sourceHeight}px`);
    document.documentElement.style.setProperty("--bus-crop-offset-x", `${offsetX}px`);
    document.documentElement.style.setProperty("--bus-crop-offset-y", `${offsetY}px`);
  }

  function updateClock() {
    const now = new Date();
    const timezone = config.location.timezone;
    renderFlipClock(clockFormatter.format(now));
    elements.dateLine.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(now);
  }

  function renderFlipClock(value) {
    if (!elements.clock || elements.clock.dataset.value === value) {
      return;
    }

    const characters = Array.from(value);
    const existingCharacters = elements.clock.querySelectorAll("[data-clock-character]");

    elements.clock.setAttribute("aria-label", value);

    if (existingCharacters.length !== characters.length) {
      elements.clock.replaceChildren(...characters.map(createClockCharacter));
      elements.clock.dataset.value = value;
      return;
    }

    characters.forEach((character, index) => {
      const characterElement = existingCharacters[index];
      if (characterElement.dataset.clockCharacter === character) {
        return;
      }

      characterElement.dataset.clockCharacter = character;

      if (characterElement.classList.contains("flip-separator")) {
        characterElement.textContent = character;
        return;
      }

      const card = characterElement.querySelector(".flip-card");
      card.textContent = character;
      card.classList.remove("is-flipping");
      void card.offsetWidth;
      card.classList.add("is-flipping");
    });

    elements.clock.dataset.value = value;
  }

  function createClockCharacter(character) {
    const isSeparator = character === ":";
    const characterElement = document.createElement("span");
    characterElement.dataset.clockCharacter = character;
    characterElement.className = isSeparator ? "flip-separator" : "flip-unit";
    characterElement.setAttribute("aria-hidden", "true");

    if (isSeparator) {
      characterElement.textContent = character;
      return characterElement;
    }

    const card = document.createElement("span");
    card.className = "flip-card";
    card.textContent = character;
    characterElement.append(card);
    return characterElement;
  }

  async function refreshWeather() {
    try {
      const weather = await fetchWeather();
      latestWeatherData = weather;
      renderWeather(weather);
      elements.weatherStatus.textContent = "";
    } catch (error) {
      elements.weatherTitle.textContent = "Weather unavailable";
      elements.weatherStatus.textContent = readableError(error);
    }
  }

  async function fetchWeather() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", config.location.latitude);
    url.searchParams.set("longitude", config.location.longitude);
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation"
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,daylight_duration"
    );
    url.searchParams.set("timezone", config.location.timezone || "auto");
    url.searchParams.set("forecast_days", "5");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather service returned ${response.status}`);
    }

    return response.json();
  }

  function renderWeather(data) {
    elements.weatherLocation.textContent = config.location.label;
    elements.weatherTitle.textContent = "";
    renderSunCycle(data);
    renderTodayWeatherFrame(data);
    renderForecast(data);
  }

  function renderSunCycle(data) {
    if (!elements.sunPanel) {
      return;
    }

    const daily = data.daily || {};
    const sunrise = Array.isArray(daily.sunrise) ? daily.sunrise[0] : "";
    const sunset = Array.isArray(daily.sunset) ? daily.sunset[0] : "";
    const sunriseMinutes = minutesFromIsoTime(sunrise);
    const sunsetMinutes = minutesFromIsoTime(sunset);
    const nowMinutes = timeOfDayMinutes(new Date(), config.location.timezone);

    if (
      !Number.isFinite(sunriseMinutes) ||
      !Number.isFinite(sunsetMinutes) ||
      sunsetMinutes <= sunriseMinutes
    ) {
      elements.sunriseTime.textContent = "--:--";
      elements.sunsetTime.textContent = "--:--";
      elements.daylightRemaining.textContent = "--";
      elements.sunPanel.classList.add("is-loading");
      return;
    }

    const daylightMinutes = sunsetMinutes - sunriseMinutes;
    const remainingMinutes =
      nowMinutes < sunriseMinutes
        ? daylightMinutes
        : Math.max(sunsetMinutes - nowMinutes, 0);
    const progress = Math.min(
      Math.max((nowMinutes - sunriseMinutes) / daylightMinutes, 0),
      1
    );
    const sunX = 9 + progress * 82;
    const sunY = 78 - Math.sin(progress * Math.PI) * 58;

    elements.sunriseTime.textContent = formatIsoTime(sunrise);
    elements.sunsetTime.textContent = formatIsoTime(sunset);
    elements.daylightRemaining.textContent =
      nowMinutes < sunriseMinutes
        ? formatDurationMinutes(daylightMinutes)
        : formatDurationMinutes(remainingMinutes);
    elements.sunPanel.style.setProperty("--sun-x", `${sunX}%`);
    elements.sunPanel.style.setProperty("--sun-y", `${sunY}%`);
    elements.sunPanel.style.setProperty("--sun-progress-percent", `${progress * 100}%`);
    elements.sunPanel.style.setProperty("--sun-progress-width", `${progress * 82}%`);
    elements.sunPanel.classList.toggle("is-night", nowMinutes >= sunsetMinutes);
    elements.sunPanel.classList.remove("is-loading");
  }

  function renderTodayWeatherFrame(data) {
    if (!elements.todayWeatherFrame) {
      return;
    }

    const current = data.current || {};
    const daily = data.daily || {};
    const code = Number(current.weather_code);
    const high = Array.isArray(daily.temperature_2m_max)
      ? daily.temperature_2m_max[0]
      : undefined;
    const low = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : undefined;
    const humidity = Number(current.relative_humidity_2m);
    const condition = weatherDescription(code);
    const icon = weatherIcon(code);
    const rootStyle = getComputedStyle(document.documentElement);
    const textColor = rootStyle.getPropertyValue("--text").trim() || "#fff";
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        color: ${escapeAttribute(textColor)};
        font-family: "Bahnschrift", "Bahnschrift SemiCondensed", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        display: grid;
        grid-template-rows: minmax(0, 1fr) max-content;
        gap: 0;
        padding: 2px 8px 7px;
      }

      .top {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
        gap: 6px;
      }

      .icon {
        font-size: clamp(3rem, 24vmin, 4.8rem);
        line-height: 1;
      }

      .temp {
        font-size: clamp(4.5rem, 41vmin, 7.1rem);
        font-weight: 850;
        line-height: 0.78;
      }

      .condition {
        margin: 0;
        font-size: clamp(1.25rem, 10vmin, 2rem);
        font-weight: 800;
        line-height: 0.95;
      }

      .details {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 2px;
        margin: 0;
        padding-top: 2px;
        font-size: clamp(0.62rem, 3.4vmin, 0.78rem);
        font-weight: 750;
        line-height: 1.08;
        opacity: 0.82;
      }

      .details span {
        min-width: 0;
        overflow: hidden;
        text-overflow: clip;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <div class="top">
      <div class="icon" aria-hidden="true">${icon}</div>
      <div>
        <div class="temp">${escapeHtml(formatTemp(current.temperature_2m))}</div>
        <p class="condition">${escapeHtml(condition)}</p>
      </div>
    </div>
    <p class="details">
      <span>Feels ${escapeHtml(formatTemp(current.apparent_temperature))}</span>
      <span>Humidity ${Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "--"}</span>
      <span>${escapeHtml(formatTemp(high))} / ${escapeHtml(formatTemp(low))}</span>
    </p>
  </body>
</html>`;
    elements.todayWeatherFrame.srcdoc = html;
  }

  function renderForecast(data) {
    if (!elements.forecastList) {
      return;
    }

    const daily = data.daily || {};
    const dates = Array.isArray(daily.time) ? daily.time : [];
    const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];
    const highs = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
    const lows = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
    const rain = Array.isArray(daily.precipitation_probability_max)
      ? daily.precipitation_probability_max
      : [];

    elements.forecastList.replaceChildren();

    dates.slice(0, 5).forEach((date, index) => {
      const item = document.createElement("li");
      const day = document.createElement("p");
      const icon = document.createElement("p");
      const temps = document.createElement("p");
      const rainChance = document.createElement("p");
      const code = Number(codes[index]);

      day.className = "forecast-day";
      icon.className = "forecast-icon";
      temps.className = "forecast-temps";
      rainChance.className = "forecast-rain";
      day.textContent = formatForecastDay(date, index);
      icon.textContent = weatherIcon(code);
      temps.textContent = `${formatTemp(highs[index])} / ${formatTemp(lows[index])}`;
      rainChance.textContent = Number.isFinite(rain[index]) ? `${Math.round(rain[index])}% rain` : "";

      item.append(day, icon, temps, rainChance);
      elements.forecastList.append(item);
    });
  }

  async function refreshEvents() {
    try {
      const response = await fetch(config.calendar.eventsUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Calendar snapshot returned ${response.status}`);
      }
      const snapshot = await response.json();
      const events = Array.isArray(snapshot.events) ? snapshot.events : [];
      renderEvents(events.slice(0, config.calendar.maxEvents));

      const today = dateKey(new Date(), config.location.timezone);
      elements.calendarStatus.textContent =
        snapshot.date && snapshot.date !== today ? `Snapshot for ${snapshot.date}` : "Today";
    } catch (error) {
      elements.eventCount.textContent = "0";
      elements.eventList.replaceChildren();
      elements.calendarStatus.textContent = readableError(error);
    }
  }

  function renderEvents(events) {
    elements.eventList.replaceChildren();
    elements.eventCount.textContent = String(events.length);

    if (events.length === 0) {
      const item = document.createElement("li");
      const title = document.createElement("p");
      title.className = "event-title";
      title.textContent = config.calendar.emptyMessage;
      item.append(title);
      elements.eventList.append(item);
      return;
    }

    for (const event of events) {
      const item = document.createElement("li");
      const time = document.createElement("p");
      const title = document.createElement("p");
      time.className = "event-time";
      title.className = "event-title";
      time.textContent = formatEventTime(event);
      title.textContent = event.title || "Untitled event";
      item.append(time, title);

      if (event.location) {
        const location = document.createElement("p");
        location.className = "event-location";
        location.textContent = event.location;
        item.append(location);
      }

      elements.eventList.append(item);
    }
  }

  async function refreshPhoto() {
    try {
      const manifestPhotos = await fetchPhotoManifest();
      const photos = manifestPhotos.length > 0 ? manifestPhotos : await fetchRuntimeFlickrFeed();

      if (photos.length === 0) {
        renderPhotoPlaceholder("Photo source: Flickr");
        return;
      }

      applyPhoto(pickPhoto(photos));
    } catch (error) {
      renderPhotoPlaceholder(`Photo unavailable: ${readableError(error)}`);
    }
  }

  async function fetchPhotoManifest() {
    if (!config.flickr.photosUrl) {
      return [];
    }

    try {
      const response = await fetch(config.flickr.photosUrl, { cache: "no-store" });
      if (!response.ok) {
        return [];
      }

      const snapshot = await response.json();
      return normalisePhotos(snapshot.photos || []);
    } catch {
      return [];
    }
  }

  function fetchRuntimeFlickrFeed() {
    if (!config.flickr.runtimeFeed) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      const callbackName = `smartDisplayFlickr${Date.now()}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Flickr feed timed out"));
      }, 12000);

      window[callbackName] = (payload) => {
        cleanup();
        resolve(normaliseFlickrItems(payload.items || []));
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Flickr feed failed"));
      };

      script.src = buildFlickrJsonpUrl(callbackName);
      document.head.append(script);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
    });
  }

  function buildFlickrJsonpUrl(callbackName) {
    const url = new URL("https://www.flickr.com/services/feeds/photos_public.gne");
    url.searchParams.set("format", "json");
    url.searchParams.set("jsoncallback", callbackName);
    url.searchParams.set("tagmode", "all");

    if (config.flickr.userId) {
      url.searchParams.set("id", config.flickr.userId);
    }

    if (Array.isArray(config.flickr.tags) && config.flickr.tags.length > 0) {
      url.searchParams.set("tags", config.flickr.tags.join(","));
    }

    return url.toString();
  }

  function applyPhoto(photo) {
    applyPhotoWithSampling(photo, true);
  }

  function applyPhotoWithSampling(photo, useCors) {
    const image = new Image();
    if (useCors) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => {
      renderPhotoFrame(photo, image);
      if (useCors) {
        applyPhotoMatchedPalette(image).catch(() => applyFallbackPalette());
      } else {
        applyFallbackPalette();
      }
    };
    image.onerror = () => {
      if (useCors) {
        applyPhotoWithSampling(photo, false);
        return;
      }

      if (photo.fallbackUrl && photo.fallbackUrl !== photo.imageUrl) {
        applyPhoto({ ...photo, imageUrl: photo.fallbackUrl, fallbackUrl: "" });
        return;
      }

      applyFallbackPalette();
    };
    image.src = photo.imageUrl;
  }

  function renderPhotoFrame(photo, image) {
    if (!elements.photoFrame) {
      return;
    }

    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      setPhotoAspectRatio(image.naturalWidth / image.naturalHeight);
    }

    const caption = photoCaption(photo);
    if (elements.photoCaption) {
      elements.photoCaption.textContent = caption;
    }

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #000;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img src="${escapeAttribute(photo.imageUrl)}" alt="${escapeAttribute(photo.title || "Flickr photo")}">
  </body>
</html>`;
    elements.photoFrame.srcdoc = html;
    window.requestAnimationFrame(sizePhotoFrame);
    window.setTimeout(sizePhotoFrame, 500);
  }

  function renderPhotoPlaceholder(message) {
    if (!elements.photoFrame) {
      return;
    }

    if (elements.photoCaption) {
      elements.photoCaption.textContent = "";
    }

    elements.photoFrame.srcdoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        margin: 0;
        background: #000;
        color: #fff;
        font: 700 16px/1.3 "Bahnschrift", "Bahnschrift SemiCondensed", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>${escapeHtml(message)}</body>
</html>`;
  }

  function photoCaption(photo) {
    const title = photo.title ? `${photo.title} ` : "";
    const author = photo.author ? `by ${photo.author}` : "from Flickr";
    return `Photo: ${title}${author}`;
  }

  function setPhotoAspectRatio(aspectRatio) {
    photoAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
    sizePhotoFrame();
  }

  function sizePhotoFrame() {
    if (!elements.photoPanel) {
      return;
    }

    const panelRect = elements.photoPanel.getBoundingClientRect();
    if (panelRect.width === 0 || panelRect.height === 0) {
      return;
    }

    const captionHeight = elements.photoCaption
      ? elements.photoCaption.getBoundingClientRect().height + 6
      : 0;
    const availableHeight = Math.max(panelRect.height - captionHeight, 0);
    let frameWidth = panelRect.width;
    let frameHeight = frameWidth / photoAspectRatio;

    if (frameHeight > availableHeight) {
      frameHeight = availableHeight;
      frameWidth = frameHeight * photoAspectRatio;
    }

    document.documentElement.style.setProperty("--photo-frame-width", `${frameWidth}px`);
    document.documentElement.style.setProperty("--photo-frame-height", `${frameHeight}px`);
  }

  async function applyFallbackPalette() {
    const colors = await fetchWadaColors();
    const pair = chooseFallbackThemePair(colors, Number(config.theme.minContrast) || 4.5);
    applyThemePair(pair.background, pair.text);
    refreshThemedFrames();
  }

  async function fetchWadaColors() {
    const fallback = [
      { hex: "#1f2937" },
      { hex: "#f8fafc" },
      { hex: "#36454f" },
      { hex: "#fff7d6" }
    ];

    if (!config.theme.colorsUrl) {
      return fallback;
    }

    try {
      const response = await fetch(config.theme.colorsUrl, { cache: "force-cache" });
      if (!response.ok) {
        return fallback;
      }

      const payload = await response.json();
      return Array.isArray(payload.colors)
        ? payload.colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color.hex))
        : fallback;
    } catch {
      return fallback;
    }
  }

  async function applyPhotoMatchedPalette(image) {
    const sampledColors = sampleImageColors(image);
    if (!sampledColors) {
      throw new Error("Photo colors unavailable");
    }

    const colors = await fetchWadaColors();
    const pair = choosePhotoThemePair(colors, sampledColors, Number(config.theme.minContrast) || 4.5);
    applyThemePair(pair.background, pair.text);
    refreshThemedFrames();
  }

  function sampleImageColors(image) {
    try {
      const sampleSize = 48;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return null;
      }

      canvas.width = sampleSize;
      canvas.height = sampleSize;
      context.drawImage(image, 0, 0, sampleSize, sampleSize);

      const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
      const totals = { r: 0, g: 0, b: 0 };
      let count = 0;
      let featured = null;
      let featuredScore = -Infinity;

      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 128) {
          continue;
        }

        const rgb = {
          r: pixels[index],
          g: pixels[index + 1],
          b: pixels[index + 2]
        };
        const stats = colorStats(rgb);
        const midtone = 1 - Math.min(Math.abs(stats.luminance - 0.5) * 2, 1);
        const score = stats.saturation * 0.72 + midtone * 0.28;

        totals.r += rgb.r;
        totals.g += rgb.g;
        totals.b += rgb.b;
        count += 1;

        if (score > featuredScore) {
          featured = rgb;
          featuredScore = score;
        }
      }

      if (count === 0) {
        return null;
      }

      const average = {
        r: Math.round(totals.r / count),
        g: Math.round(totals.g / count),
        b: Math.round(totals.b / count)
      };

      return { average, featured: featured || average };
    } catch {
      return null;
    }
  }

  function choosePhotoThemePair(colors, sampledColors, minContrast) {
    const usableColors = colors.length >= 2 ? colors : [{ hex: "#1f2937" }, { hex: "#f8fafc" }];
    const background = nearestWadaColor(usableColors, sampledColors.featured).hex;
    const backgroundRgb = hexToRgb(background);
    const readableColors = usableColors
      .filter((color) => color.hex !== background)
      .map((color) => ({
        color,
        rgb: hexToRgb(color.hex)
      }))
      .filter((entry) => contrastRatio(backgroundRgb, entry.rgb) >= minContrast);

    if (readableColors.length === 0) {
      return chooseFallbackThemePair(usableColors, minContrast);
    }

    readableColors.sort((first, second) => {
      const firstScore =
        colorDistance(first.rgb, sampledColors.average) - contrastRatio(backgroundRgb, first.rgb) * 12;
      const secondScore =
        colorDistance(second.rgb, sampledColors.average) - contrastRatio(backgroundRgb, second.rgb) * 12;
      return firstScore - secondScore;
    });

    return { background, text: readableColors[0].color.hex };
  }

  function nearestWadaColor(colors, rgb) {
    return colors.reduce((nearest, color) => {
      const distance = colorDistance(hexToRgb(color.hex), rgb);
      return distance < nearest.distance ? { color, distance } : nearest;
    }, { color: colors[0], distance: Infinity }).color;
  }

  function chooseFallbackThemePair(colors, minContrast) {
    const usableColors = colors.length >= 2 ? colors : [{ hex: "#1f2937" }, { hex: "#f8fafc" }];
    const attempts = Math.max(usableColors.length * 8, 80);

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const background = usableColors[refreshIndex(usableColors.length, `theme-background-${attempt}`)].hex;
      const text = usableColors[refreshIndex(usableColors.length, `theme-text-${attempt}`)].hex;

      if (background !== text && contrastRatio(hexToRgb(background), hexToRgb(text)) >= minContrast) {
        return { background, text };
      }
    }

    return { background: "#1f2937", text: "#f8fafc" };
  }

  function applyThemePair(backgroundHex, textHex) {
    const background = hexToRgb(backgroundHex);
    const text = hexToRgb(textHex);
    const panel = mixRgb(background, text, 0.12);
    const panelStrong = mixRgb(background, text, 0.08);

    document.documentElement.style.setProperty("--page-background", backgroundHex);
    document.documentElement.style.setProperty("--text", textHex);
    document.documentElement.style.setProperty("--muted", rgbCss(text, 0.72));
    document.documentElement.style.setProperty("--soft", rgbCss(text, 0.58));
    document.documentElement.style.setProperty("--accent", rgbCss(text, 0.86));
    document.documentElement.style.setProperty("--warn", rgbCss(text, 0.86));
    document.documentElement.style.setProperty("--line", rgbCss(text, 0.18));
    document.documentElement.style.setProperty("--panel", rgbCss(panel, 0.78));
    document.documentElement.style.setProperty("--panel-strong", rgbCss(panelStrong, 0.88));
  }

  function refreshThemedFrames() {
    if (latestWeatherData) {
      renderTodayWeatherFrame(latestWeatherData);
    }
  }

  function normaliseFlickrItems(items) {
    return items
      .filter((item) => item && item.media && item.media.m)
      .map((item) => ({
        title: item.title || "",
        author: cleanFlickrAuthor(item.author || ""),
        pageUrl: item.link || "",
        imageUrl: largerFlickrImage(item.media.m),
        fallbackUrl: item.media.m
      }));
  }

  function normalisePhotos(photos) {
    return photos
      .filter((photo) => photo && photo.imageUrl)
      .map((photo) => ({
        title: photo.title || "",
        author: photo.author || "",
        pageUrl: photo.pageUrl || "",
        imageUrl: photo.imageUrl,
        fallbackUrl: photo.fallbackUrl || photo.imageUrl
      }));
  }

  function pickPhoto(photos) {
    const index = refreshIndex(photos.length, "photo");
    return photos[index];
  }

  function scheduleHourlyDisplayRefresh() {
    window.setTimeout(() => {
      refreshPhoto();
      scheduleHourlyDisplayRefresh();
    }, msUntilNextRefreshSlot());
  }

  function msUntilNextRefreshSlot() {
    const refreshMs = getPhotoRefreshMs();
    const elapsedMs = Date.now() % refreshMs;
    return Math.max(refreshMs - elapsedMs + 1000, 60 * 1000);
  }

  function getPhotoRefreshMs() {
    const minutes = Number(config.flickr.refreshMinutes) || 60;
    return Math.max(minutes, 60) * 60 * 1000;
  }

  function formatEventTime(event) {
    if (event.allDay) {
      return "All day";
    }

    const start = event.start ? new Date(event.start) : null;
    const end = event.end ? new Date(event.end) : null;
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: config.location.timezone,
      hour: "2-digit",
      minute: "2-digit"
    });

    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return `${formatter.format(start)} to ${formatter.format(end)}`;
    }

    return start && !Number.isNaN(start.getTime()) ? formatter.format(start) : "";
  }

  function weatherDescription(code) {
    const descriptions = new Map([
      [0, "Clear"],
      [1, "Mostly clear"],
      [2, "Partly cloudy"],
      [3, "Overcast"],
      [45, "Fog"],
      [48, "Freezing fog"],
      [51, "Light drizzle"],
      [53, "Drizzle"],
      [55, "Heavy drizzle"],
      [61, "Light rain"],
      [63, "Rain"],
      [65, "Heavy rain"],
      [71, "Light snow"],
      [73, "Snow"],
      [75, "Heavy snow"],
      [80, "Rain showers"],
      [81, "Rain showers"],
      [82, "Heavy showers"],
      [95, "Thunderstorm"],
      [96, "Thunderstorm"],
      [99, "Thunderstorm"]
    ]);
    return descriptions.get(code) || "Current weather";
  }

  function weatherIcon(code) {
    if ([0, 1].includes(code)) {
      return "☀";
    }
    if (code === 2) {
      return "⛅";
    }
    if ([3, 45, 48].includes(code)) {
      return "☁";
    }
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      return "☔";
    }
    if ([71, 73, 75].includes(code)) {
      return "❄";
    }
    if ([95, 96, 99].includes(code)) {
      return "⚡";
    }
    return "○";
  }

  function formatForecastDay(date, index) {
    if (index === 0) {
      return "Today";
    }

    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat("en-GB", {
      timeZone: config.location.timezone,
      weekday: "short"
    }).format(parsed);
  }

  function formatTemp(value) {
    return Number.isFinite(value) ? `${Math.round(value)}\u00b0` : "--";
  }

  function dateKey(date, timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function timeOfDayMinutes(date, timezone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  }

  function minutesFromIsoTime(value) {
    const match = String(value).match(/T(\d{2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
  }

  function formatIsoTime(value) {
    const match = String(value).match(/T(\d{2}:\d{2})/);
    return match ? match[1] : "--:--";
  }

  function formatDurationMinutes(minutes) {
    const totalMinutes = Math.max(Math.round(minutes), 0);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  }

  function largerFlickrImage(url) {
    return url.replace(/_m(\.[a-z]+)$/i, "_b$1");
  }

  function cleanFlickrAuthor(author) {
    const match = author.match(/\("(.+)"\)/);
    return match ? match[1] : author;
  }

  function refreshIndex(length, salt) {
    return hashString(`${refreshSlotKey()}:${salt}`) % length;
  }

  function refreshSlotKey() {
    return Math.floor(Date.now() / getPhotoRefreshMs());
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function colorDistance(first, second) {
    const redMean = (first.r + second.r) / 2;
    const redDelta = first.r - second.r;
    const greenDelta = first.g - second.g;
    const blueDelta = first.b - second.b;

    return Math.sqrt(
      (2 + redMean / 256) * redDelta ** 2 +
        4 * greenDelta ** 2 +
        (2 + (255 - redMean) / 256) * blueDelta ** 2
    );
  }

  function colorStats(rgb) {
    const red = rgb.r / 255;
    const green = rgb.g / 255;
    const blue = rgb.b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    const saturation =
      max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));

    return {
      luminance: relativeLuminance(rgb),
      saturation
    };
  }

  function contrastRatio(first, second) {
    const firstLuminance = relativeLuminance(first);
    const secondLuminance = relativeLuminance(second);
    const light = Math.max(firstLuminance, secondLuminance);
    const dark = Math.min(firstLuminance, secondLuminance);
    return (light + 0.05) / (dark + 0.05);
  }

  function relativeLuminance(rgb) {
    const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16)
    };
  }

  function mixRgb(first, second, amount) {
    return {
      r: Math.round(first.r * (1 - amount) + second.r * amount),
      g: Math.round(first.g * (1 - amount) + second.g * amount),
      b: Math.round(first.b * (1 - amount) + second.b * amount)
    };
  }

  function rgbCss(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function readableError(error) {
    return error && error.message ? error.message : "Unknown error";
  }

  function mergeConfig(base, override) {
    const output = { ...base };
    for (const [key, value] of Object.entries(override)) {
      output[key] =
        value && typeof value === "object" && !Array.isArray(value)
          ? mergeConfig(base[key] || {}, value)
          : value;
    }
    return output;
  }
})();
