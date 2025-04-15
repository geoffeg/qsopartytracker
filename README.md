# qsopartytracker

This is a simple web app that tracks QSO party stations using the APRS-IS network. Stations beacon their location and frequencies, and this app will display their location, county, and other information on a map.

![qsopartytracker](https://raw.githubusercontent.com/geoffeg/qsopartytracker/main/screenshot.png)

The app is written in javascript, using [Bun](https://bun.sh/) as the runtime and (Hono)[https://hono.dev/] as the web framework. The station information is stored in an SQLite database. The frontend is a combination of [Leaflet](https://leafletjs.com/) for the map and [HTMX](https://htmx.org/) for the dynamic content loading as well as some vanilla JS.

# Development

To install dependencies:

1. Install [Bun](https://bun.sh/)
2. Clone this repository
3. Install dependencies with `bun install`

Take a look at config.js and adjust settings accordingly.

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

There are a number of options for deploying this app, depending on your needs. You can run it standalone directly from inside this repo. `bun run daemon-and-server` is provided to simplify running both the aprs listener and the webserver.

You can run the app inside a docker container, which many hosting providers support. I've also provided the terraform files to deploy this app to AWS using ECS. This is a bit more complicated, but it allows for easy scaling and management of the app.

## Standalone

After installing the depenencies, you can run the app directly inside the repo. This is the simplest way to run the app, but it does require the proper tools (bun, etc) to be installed on whatever machine you're going to expose to the app to the internet on. To run the app, you can run the following command:

```bash
bun run daemon-and-server
```

This will put the app in "production" mode.

## Docker

To build: 
```bash
docker build . --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t qsopartytracker
```

To run in the background, you'll need to setup a volume for the database and a volume for the config file. The database will be automatically created, but you'll need to provide the config.js (see instructions above).
```bash
docker run -d -p 3000:3000 --name=qsopartytracker --volume=/path/to/directory/qsopartytracker:/opt/ --volume=/path/to/directory/with/config.js -e DB_PATH=/opt/aprs.db qsopartytracker
```

## Terraform

Finally, you can deploy this app to AWS using ECS. This is a bit more complicated, but it allows for easy scaling and management of the app. The terraform files are provided in the `terraform` directory. You'll need to set up your AWS credentials and then run the following commands:

```bash
cd terraform
terraform install
terraform init
terraform plan
```
This will display terraform's plan, what it will do to your AWS account. READ IT CAREFULLY, terraform will create resources, but it will also destroy resources. If you are happy with the plan, you can run:

```bash
terraform apply
```
This will create the resources in your AWS account. You can then run `terraform destroy` to remove the resources when you're done with them.

# License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

