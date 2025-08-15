export const ENV = {
  URL: {
    "app-dev.practicespace.health": "https://ca-yto-8b3f79b2.colyseus.cloud",
    "preview--whiteboard-mockup-v2.lovable.app":
      "https://ca-yto-8b3f79b2.colyseus.cloud",
    "app-dev.playspace.health": "https://ca-yto-8b3f79b2.colyseus.cloud",
    "app-staging.playspace.health": "https://ca-yto-8b3f79b2.colyseus.cloud",
    "app.practicespace.health": "https://ca-yto-dd1ed7a2.colyseus.cloud",
    "app.playspace.health": "https://ca-yto-dd1ed7a2.colyseus.cloud",
    localhost: "http://localhost:4001",
  },
  // DEFAULT_URL: 'https://ca-yto-8b3f79b2.colyseus.cloud', // TODO reset
  DEFAULT_URL: "http://localhost:4001",
  STATE_VERSION: 1,
};

export function getConfigurationServerURL() {
  const domain = window.location.hostname;
  
  let server = ENV.URL[domain];
  if (!server) {
    console.warn(
      `[Whiteboard] Not able to find configuration for domain [${domain}], will connect to DEFAULT URL`
    );
    server = ENV.DEFAULT_URL;
  }

  
  return server;
}
