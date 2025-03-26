# qsopartytracker

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.1.20. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.


# Docker

To build: 
```docker build . --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t qsopartytracker```

To run one time:
```docker run --rm -p 3000:3000 --name=qsopartytracker --volume=/path/to/directory/qsopartytracker:/opt/ -e DB_PATH=/opt/aprs.db qsopartytracker```

To run in the background:
```docker run -d -p 3000:3000 --name=qsopartytracker --volume=/path/to/directory/qsopartytracker:/opt/ -e DB_PATH=/opt/aprs.db qsopartytracker```

# Todo
* Don't hardcode the counties KML file, move to config
* CICD
* Config for things like filters?
* Highlight row?
* Fix dwell time. If station moves back into a county it shouldn't show