# qsopartytracker

This is a simple web app that tracks QSO party stations using the APRS-IS network. Stations beacon their location and frequencies, and this app will display their location, county, and other information on a map.

![qsopartytracker](https://raw.githubusercontent.com/geoffeg/qsopartytracker/main/screenshot.png)

The app is written in javascript, using [Bun](https://bun.sh/) as the runtime and (Hono)[https://hono.dev/] as the web framework. The station information is stored in an SQLite database. The frontend is a combination of [Leaflet](https://leafletjs.com/) for the map and [HTMX](https://htmx.org/) for the dynamic content loading as well as some vanilla JS.

# Development

To install dependencies:

1. Install [Bun](https://bun.sh/)
2. Clone this repository
3. Install dependencies with `bun install`

To run the development app, start the aprs listener:
```bash
bun run aprs-daemon
```

To run the web server:
```bash
bun run dev
```

Then point your browser at [http://localhost:3000](http://localhost:3000) to see the app.

# Deployment

## Docker

To build: 
```docker build . --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t qsopartytracker```

To run one time:
```docker run --rm -p 3000:3000 --name=qsopartytracker --volume=/path/to/directory/qsopartytracker:/opt/ -e DB_PATH=/opt/aprs.db qsopartytracker```

To run in the background:
```docker run -d -p 3000:3000 --name=qsopartytracker --volume=/path/to/directory/qsopartytracker:/opt/ -e DB_PATH=/opt/aprs.db qsopartytracker```

