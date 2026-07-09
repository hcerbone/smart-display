#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";

const dataDirectory = new URL("../data/", import.meta.url);
const displayTimezone = process.env.DISPLAY_TIMEZONE || "Europe/London";
const displayDate = process.env.DISPLAY_DATE || dateKey(new Date(), displayTimezone);
const maxEvents = Number.parseInt(process.env.MAX_EVENTS || "6", 10);
const eventKeywords = splitList(process.env.EVENT_KEYWORDS || "").map((item) =>
  item.toLowerCase()
);

await mkdir(dataDirectory, { recursive: true });
await writeJson(new URL("events.json", dataDirectory), await buildEventsSnapshot());
await writeJson(new URL("photos.json", dataDirectory), await buildPhotosSnapshot());

async function buildEventsSnapshot() {
  const calendarUrl = process.env.CALENDAR_ICS_URL;

  if (!calendarUrl) {
    return { date: displayDate, events: [] };
  }

  const ics = await fetchText(calendarUrl, "calendar");
  const events = parseIcs(ics)
    .flatMap((event) => expandEventForDate(event, displayDate, displayTimezone))
    .filter(matchesKeywordFilter)
    .sort((left, right) => left.sortTime - right.sortTime)
    .slice(0, Number.isFinite(maxEvents) ? maxEvents : 6)
    .map(({ sortTime, ...event }) => event);

  return { date: displayDate, events };
}

async function buildPhotosSnapshot() {
  const feedUrl = process.env.FLICKR_FEED_URL || buildFlickrFeedUrl();

  if (!feedUrl) {
    return { source: "Flickr public feed", photos: [] };
  }

  const payload = await fetchText(feedUrl, "Flickr feed");
  const json = parseMaybeJsonp(payload);
  const photos = (json.items || [])
    .filter((item) => item.media && item.media.m)
    .map((item) => ({
      title: item.title || "",
      author: cleanFlickrAuthor(item.author || ""),
      pageUrl: item.link || "",
      imageUrl: largerFlickrImage(item.media.m),
      fallbackUrl: item.media.m
    }))
    .slice(0, 40);

  return { source: "Flickr public feed", photos };
}

function buildFlickrFeedUrl() {
  const tags = splitList(process.env.FLICKR_TAGS || "");
  const userId = process.env.FLICKR_USER_ID || "40979668@N08";
  const url = new URL("https://www.flickr.com/services/feeds/photos_public.gne");
  url.searchParams.set("format", "json");
  url.searchParams.set("nojsoncallback", "1");
  url.searchParams.set("tagmode", "all");

  if (userId) {
    url.searchParams.set("id", userId);
  }

  if (tags.length > 0) {
    url.searchParams.set("tags", tags.join(","));
  }

  return url.toString();
}

async function fetchText(url, label) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "smart-display-data-updater"
    }
  });

  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}`);
  }

  return response.text();
}

function parseIcs(content) {
  const lines = unfoldIcsLines(content);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const property = parseIcsProperty(line);
    if (!property) {
      continue;
    }

    if (property.name === "DTSTART") {
      current.start = parseIcsDate(property.value, property.params);
    } else if (property.name === "DTEND") {
      current.end = parseIcsDate(property.value, property.params);
    } else if (property.name === "SUMMARY") {
      current.title = unescapeIcsText(property.value);
    } else if (property.name === "LOCATION") {
      current.location = unescapeIcsText(property.value);
    } else if (property.name === "DESCRIPTION") {
      current.description = unescapeIcsText(property.value);
    } else if (property.name === "RRULE") {
      current.rrule = parseRrule(property.value);
    } else if (property.name === "EXDATE") {
      current.exdates = current.exdates || [];
      current.exdates.push(
        ...property.value.split(",").map((value) => parseIcsDate(value, property.params))
      );
    }
  }

  return events;
}

function expandEventForDate(event, targetDate, timezone) {
  if (!event.start) {
    return [];
  }

  const day = dayBounds(targetDate, timezone);
  const duration = eventDuration(event);
  const occurrenceStarts = event.rrule
    ? recurringOccurrenceStarts(event, targetDate, timezone)
    : [event.start.date];

  return occurrenceStarts
    .map((start) => ({
      start,
      end: new Date(start.getTime() + duration)
    }))
    .filter((occurrence) => occurrence.start < day.end && occurrence.end > day.start)
    .filter((occurrence) => !isExcluded(event, occurrence.start, timezone))
    .map((occurrence) => ({
      title: event.title || "Untitled event",
      location: event.location || "",
      start: event.start.allDay ? null : occurrence.start.toISOString(),
      end: event.start.allDay ? null : occurrence.end.toISOString(),
      allDay: event.start.allDay,
      sortTime: event.start.allDay ? day.start.getTime() : occurrence.start.getTime()
    }));
}

function recurringOccurrenceStarts(event, targetDate, timezone) {
  const rrule = event.rrule;
  const candidateDates = [targetDate, addDaysToDateKey(targetDate, -1, timezone)];

  return candidateDates
    .filter((candidateDate) => dateMatchesRrule(candidateDate, event.start, rrule, timezone))
    .map((candidateDate) => occurrenceStartForDate(candidateDate, event.start));
}

function dateMatchesRrule(candidateDate, eventStart, rrule, timezone) {
  const startParts = zonedParts(eventStart.date, eventStart.timezone || timezone);
  const candidateParts = parseDateKey(candidateDate);
  const candidateStart = makeDateInTimeZone(
    candidateParts.year,
    candidateParts.month,
    candidateParts.day,
    startParts.hour,
    startParts.minute,
    startParts.second,
    eventStart.timezone || timezone
  );

  if (candidateStart < eventStart.date) {
    return false;
  }

  if (rrule.until && candidateStart > rrule.until.date) {
    return false;
  }

  const interval = Number.parseInt(rrule.interval || "1", 10);
  const safeInterval = Number.isFinite(interval) && interval > 0 ? interval : 1;
  const startDate = `${startParts.year}-${pad(startParts.month)}-${pad(startParts.day)}`;

  if (rrule.freq === "DAILY") {
    const days = daysBetween(startDate, candidateDate);
    return days % safeInterval === 0;
  }

  if (rrule.freq === "WEEKLY") {
    const weeks = Math.floor(daysBetween(startDate, candidateDate) / 7);
    const byDay = rrule.byday.length > 0 ? rrule.byday : [weekdayCode(eventStart.date, timezone)];
    return weeks % safeInterval === 0 && byDay.includes(weekdayCode(candidateStart, timezone));
  }

  if (rrule.freq === "MONTHLY") {
    const months =
      (candidateParts.year - startParts.year) * 12 + (candidateParts.month - startParts.month);
    return months % safeInterval === 0 && candidateParts.day === startParts.day;
  }

  if (rrule.freq === "YEARLY") {
    const years = candidateParts.year - startParts.year;
    return (
      years % safeInterval === 0 &&
      candidateParts.month === startParts.month &&
      candidateParts.day === startParts.day
    );
  }

  return false;
}

function occurrenceStartForDate(candidateDate, eventStart) {
  const parts = parseDateKey(candidateDate);
  const startParts = zonedParts(eventStart.date, eventStart.timezone || displayTimezone);
  return makeDateInTimeZone(
    parts.year,
    parts.month,
    parts.day,
    startParts.hour,
    startParts.minute,
    startParts.second,
    eventStart.timezone || displayTimezone
  );
}

function eventDuration(event) {
  if (event.end) {
    return Math.max(event.end.date.getTime() - event.start.date.getTime(), 1);
  }

  return event.start.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
}

function isExcluded(event, occurrenceStart, timezone) {
  if (!event.exdates) {
    return false;
  }

  return event.exdates.some((excluded) => {
    if (excluded.allDay || event.start.allDay) {
      return dateKey(excluded.date, timezone) === dateKey(occurrenceStart, timezone);
    }

    return Math.abs(excluded.date.getTime() - occurrenceStart.getTime()) < 60 * 1000;
  });
}

function matchesKeywordFilter(event) {
  if (eventKeywords.length === 0) {
    return true;
  }

  const haystack = `${event.title} ${event.location}`.toLowerCase();
  return eventKeywords.some((keyword) => haystack.includes(keyword));
}

function parseIcsDate(value, params = {}) {
  const raw = value.trim();
  const isAllDay = params.VALUE === "DATE" || /^\d{8}$/.test(raw);

  if (isAllDay) {
    const year = Number.parseInt(raw.slice(0, 4), 10);
    const month = Number.parseInt(raw.slice(4, 6), 10);
    const day = Number.parseInt(raw.slice(6, 8), 10);
    return {
      date: makeDateInTimeZone(year, month, day, 0, 0, 0, displayTimezone),
      allDay: true,
      timezone: displayTimezone
    };
  }

  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) {
    return { date: new Date(raw), allDay: false, timezone: displayTimezone };
  }

  const [, year, month, day, hour, minute, second = "00", utcMarker] = match;
  const timezone = utcMarker ? "UTC" : params.TZID || displayTimezone;
  const date = utcMarker
    ? new Date(
        Date.UTC(
          Number.parseInt(year, 10),
          Number.parseInt(month, 10) - 1,
          Number.parseInt(day, 10),
          Number.parseInt(hour, 10),
          Number.parseInt(minute, 10),
          Number.parseInt(second, 10)
        )
      )
    : makeDateInTimeZone(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10),
        Number.parseInt(day, 10),
        Number.parseInt(hour, 10),
        Number.parseInt(minute, 10),
        Number.parseInt(second, 10),
        timezone
      );

  return { date, allDay: false, timezone };
}

function parseRrule(value) {
  const entries = Object.fromEntries(
    value.split(";").map((part) => {
      const [key, entryValue = ""] = part.split("=");
      return [key.toLowerCase(), entryValue];
    })
  );

  return {
    freq: (entries.freq || "").toUpperCase(),
    interval: entries.interval || "1",
    until: entries.until ? parseIcsDate(entries.until) : null,
    byday: splitList(entries.byday || "").map((day) => day.replace(/^[+-]?\d+/, ""))
  };
}

function parseIcsProperty(line) {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return null;
  }

  const left = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const [name, ...paramParts] = left.split(";");
  const params = {};

  for (const part of paramParts) {
    const [key, paramValue = ""] = part.split("=");
    params[key.toUpperCase()] = paramValue.replace(/^"|"$/g, "");
  }

  return { name: name.toUpperCase(), params, value };
}

function unfoldIcsLines(content) {
  return content.split(/\r?\n/).reduce((lines, line) => {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
    return lines;
  }, []);
}

function unescapeIcsText(value) {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function dayBounds(date, timezone) {
  const parts = parseDateKey(date);
  const start = makeDateInTimeZone(parts.year, parts.month, parts.day, 0, 0, 0, timezone);
  const end = makeDateInTimeZone(parts.year, parts.month, parts.day + 1, 0, 0, 0, timezone);
  return { start, end };
}

function makeDateInTimeZone(year, month, day, hour, minute, second, timezone) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = timeZoneOffset(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offset);
}

function timeZoneOffset(date, timezone) {
  if (timezone === "UTC") {
    return 0;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    hour: "2-digit"
  }).formatToParts(date);
  const zoneName = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = zoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] || "0", 10);
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number.parseInt(values.year, 10),
    month: Number.parseInt(values.month, 10),
    day: Number.parseInt(values.day, 10),
    hour: Number.parseInt(values.hour, 10),
    minute: Number.parseInt(values.minute, 10),
    second: Number.parseInt(values.second, 10)
  };
}

function dateKey(date, timezone) {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function addDaysToDateKey(date, days, timezone) {
  const bounds = dayBounds(date, timezone);
  return dateKey(new Date(bounds.start.getTime() + days * 24 * 60 * 60 * 1000), timezone);
}

function parseDateKey(date) {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  return { year, month, day };
}

function daysBetween(startDate, endDate) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

function weekdayCode(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  })
    .format(date)
    .slice(0, 2)
    .toUpperCase();
}

function parseMaybeJsonp(payload) {
  const trimmed = payload.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const json = trimmed.replace(/^[^(]*\(/, "").replace(/\);?$/, "");
  return JSON.parse(json);
}

function largerFlickrImage(url) {
  return url.replace(/_m(\.[a-z]+)$/i, "_b$1");
}

function cleanFlickrAuthor(author) {
  const match = author.match(/\("(.+)"\)/);
  return match ? match[1] : author;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

async function writeJson(url, payload) {
  await writeFile(url, `${JSON.stringify(payload, null, 2)}\n`);
}
