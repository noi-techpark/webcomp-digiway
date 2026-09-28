<!--
SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>

SPDX-License-Identifier: CC0-1.0
-->

# Generic Map to show Open Data Hub data imported within the Digiway project

[![REUSE Compliance](https://github.com/noi-techpark/webcomp-digiway/actions/workflows/reuse.yml/badge.svg)](https://github.com/noi-techpark/odh-docs/wiki/REUSE#badges)
[![REUSE status](https://api.reuse.software/badge/github.com/noi-techpark/webcomp-digiway)](https://api.reuse.software/info/github.com/noi-techpark/webcomp-digiway)
[![CI/CD](https://github.com/noi-techpark/webcomp-digiway/actions/workflows/main.yml/badge.svg)](https://github.com/noi-techpark/webcomp-digiway/actions/workflows/main.yml)

This project is a rewrite taken from the repository webcomp-generic-map. It is a webcomponent to display data imported
during the Digiway Project from the [Open Data Hub](https://opendatahub.com).

Do you want to see it in action? Go to our [web component
store](https://webcomponents.opendatahub.com/?term=digiway)!

- [Generic Map to show Open Data Hub Digiway data](#generic-map-to-show-open-data-hub-data-imported-withhin-the-digiway-project)
  - [Usage](#usage)
    - [Attributes](#attributes)
      - [language](#language)
      - [layout](#layout)
    - [CSS varialbles](#css-variables)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Source code](#source-code)
    - [Dependencies](#dependencies)
    - [Build](#build)
  - [Tests and linting](#tests-and-linting)
  - [Deployment](#deployment)
  - [Run with docker](#run-with-docker)
    - [Installation](#installation)
    - [Start the docker containers](#start-the-docker-containers)
    - [Publish a new version of your webcomponent](#publish-a-new-version-of-your-webcomponent)
    - [Stop the docker containers](#stop-the-docker-containers)
    - [Delete your webcomponents from the store](#delete-your-webcomponents-from-the-store)
  - [Information](#information)
    - [Support](#support)
    - [Contributing](#contributing)
    - [Documentation](#documentation)
    - [Boilerplate](#boilerplate)
    - [License](#license)

## Usage

Include the web-component JS wile located in `/dist/bundle/noi-digiway/` folder

```html
<script type="module" src="./noi-digiway.js"></script>
```

Define the web component like this:

```html
  <noi-digiway></noi-digiway>
```

You may adjust the size of the component with regular CSS properties.

### Attributes

#### language

Language.

Type
: string

Default
: browser language or 'en' if the language is not supported

Options
: "de", "en", "it"

#### layout

Layout appearance.
We support three layouts: desktop, tablet and mobile.

Type
: string

Default
: 'auto', which means the layout will dynamically adjust to screen size

Options
: "desktop", "tablet", "mobile", "auto"

#### centermap

Map center.
Pass latitude, longitude and zoomlevel separated by "," if map should be centered an a specific gps point

Type
: string

Default
: '46.5,11.35,10'

#### base-map

Base map used in the component
We support two maps: Open Street Map ('osm') and Tirol ('tirol').

Type
: string

Default
: 'tirol'

Options
: "osm", "tirol"


#### view-date

View date for weather data (weather layer only)

Type
: string (any js-compatible date format)


### CSS variables

This is regular CSS styles for the component, but specific adjustment is supported.

| Name                        | Description                                  |
|-----------------------------|----------------------------------------------|
| `--color-background`        | Background color                             |
| `--color-background-hover`  | Background color on hover                    |
| `--color-background-shade`  | Background darken color                      |
| `--color-border`            | Border color                                 |
| `--color-primary`           | Primary color                                |
| `--color-primary-contrast`  | Primary contrast color                       |
| `--color-secondary`         | Secondary color                              |
| `--color-tertiary`          | Tertiary color                               |
| `--color-text`              | Text color                                   |
| `--map-filter`              | 'filter' property for the map                |
| `--sidebar-width`           | Sidebar with (for desktop and tablet layout) |
| `--scrollbar-bg`            | Scrollbar background color                   |
| `--scrollbar-color`         | Scrollbar thumb color                        |

Shadow Parts:

| Part                 | Description      |
| -------------------- | ---------------- |
| `"legend"`           | Legend           |
| `"legend-container"` | Legend container |
| `"map"`              | Map              |
| `"popup"`            | Map popup dialog |
| `"sidebar"`          | Sidebar          |


Here is an example of dark mode styles:

```css

noi-digiway.dark {

  --color-primary: #0084e6;
  --color-primary-contrast: #FFFFFF;
  --color-secondary: #da1d6d;
  --color-tertiary: red;

  --color-text: #EEE;
  --color-background: #333;
  --color-background-shade: #666;
  --color-background-hover: #454545;

  --scrollbar-color: #CCC;
  --scrollbar-bg: #333;

  --map-filter: brightness(0.7) contrast(1.5);
}

noi-digiway.dark::part(popup) {
  color: #FFFFFF;
}
```

## Getting started

These instructions will get you a copy of the project up and running
on your local machine for development and testing purposes.

### Prerequisites

To build the project, the following prerequisites must be met:

- Node 22 / NPM 10

For a ready to use Docker environment with all prerequisites already installed and prepared, you can check out
the [Docker environment](#docker-environment) section.

### Source code

Get a copy of the repository:

```bash
git clone https://github.com/noi-techpark/webcomp-digiway.git
```

Change directory:

```bash
cd webcomp-digiway/
```

### Dependencies

Download all dependencies:

```bash
npm install
```

### Build

Build and start the project:

```bash
npm run start
```

The application will be served and can be accessed at [http://localhost:8998](http://localhost:8998).

## Tests and linting

The tests and the linting can be executed with the following commands:

```bash
npm run test
npm run lint
```

## Deployment

To create the distributable files, execute the following command:

```bash
npm run build
```

## Run with docker

If you want to test the webcomponent on a local instance of
the [webcomponent store](https://webcomponents.opendatahub.com/) to make sure that it will run correctly also on the real store.
You can also access the webcomponent running in a simple separated docker container outside of the store.

If you have already developed your webcomponent and now want to test it on a local instance of the store, just copy
`.env.example`, `docker-compose.yml`, `wcs-manifest.json` and `infrastructure/docker` into your root folder. Adjust your
`package.json` and `wcs-manifest.json` files as described on the top of this readme. Then follow the instructions below.

For accessing the webcomponent in a separated docker in the browser you will need a server (e.g. webpack dev-server)
that is hosting a page which includes the webcomponent tag, as well as the script defining it. This page needs to be
hosted on port 8998 as specified in your docker-compose file.

### Installation

Install [Docker](https://docs.docker.com/install/) (with Docker Compose) locally on your machine.

### Start the docker containers

- Create a .env file: <br>
  `cp .env.example .env`
- [Optional] Adjust port numbers in .env if they have conflicts with services already running on your machine
- Start the store with: <br>
  `docker-compose up -d`
- Wait until the containers are running. You can check the current state with: <br>
  `docker-compose logs --tail 500 -f`
- Access the store in your browser on: <br>
  `localhost:8999`
- Access webcomponent running in separated docker in your browser on: <br>
  `localhost:8998`

### Publish a new version of your webcomponent

- Increase version number WC_VERSION in your .env file
- Then run: `docker-compose up wcstore-cli`

### Stop the docker containers

- `docker-compose stop`

### Delete your webcomponents from the store

- `[sudo] rm -f workspace`
- `docker-compose rm -f -v postgres`

## Information

### Support

For support, please contact [help@opendatahub.com](mailto:help@opendatahub.com).

### Contributing

If you'd like to contribute, please follow the following instructions:

- Fork the repository.
- Checkout a topic branch from the `main` branch.
- Make sure the tests are passing.
- Create a pull request against the `main` branch.

A more detailed description have a look at our [Getting Started
Guide](https://github.com/noi-techpark/odh-docs/wiki/Contributor-Guidelines:-Getting-started).

### Documentation

More documentation can be found at [https://docs.opendatahub.com](https://docs.opendatahub.com).

### Boilerplate

The project uses this
boilerplate: [https://github.com/noi-techpark/webcomp-boilerplate](https://github.com/noi-techpark/webcomp-boilerplate).

### License

The code in this project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE Version 3 license. See
the [LICENSE.md](LICENSE.md) file for more information.

### REUSE

This project is [REUSE](https://reuse.software) compliant, more information about the usage of REUSE in NOI Techpark
repositories can be
found [here](https://github.com/noi-techpark/odh-docs/wiki/Guidelines-for-developers-and-licenses#guidelines-for-contributors-and-new-developers).

Since the CI for this project checks for REUSE compliance you might find it useful to use a pre-commit hook checking for
REUSE compliance locally. The [pre-commit-config](.pre-commit-config.yaml) file in the repository root is already
configured to check for REUSE compliance with help of the [pre-commit](https://pre-commit.com) tool.

Install the tool by running:

```bash
pip install pre-commit
```

Then install the pre-commit hook via the config file by running:

```bash
pre-commit install
```

