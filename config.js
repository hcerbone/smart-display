window.SMART_DISPLAY_CONFIG = {
  displayName: "Display",
  location: {
    label: "",
    latitude: 51.752022,
    longitude: -1.257677,
    timezone: "Europe/London"
  },
  bus: {
    title: "OxonTime 943",
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
    userId: "40979668@N08",
    streamName: "drcphotography",
    refreshMinutes: 60
  },
  theme: {
    colorsUrl: "https://sanzo-wada.dmbk.io/assets/colors.json",
    minContrast: 4.5
  }
};
