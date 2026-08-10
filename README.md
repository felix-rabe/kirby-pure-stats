# Kirby Pure Stats

Lightweight, privacy-friendly analytics for Kirby CMS.

Pure Stats provides simple website statistics directly in the Kirby
Panel. It tracks pageviews without cookies or external analytics
services and stores all analytics data locally in a SQLite database.

## Features

-   Pageview tracking
-   Daily pageview history
-   Statistics by year, month and the last 7 days
-   Page-level statistics
-   Local SQLite storage
-   No cookies
-   No external analytics services
-   Logged-in Panel users are excluded from tracking
-   Integrated Kirby Panel interface

## Requirements

-   Kirby 5
-   PHP with PDO SQLite support

## Installation

### Composer

``` bash
composer require felix-rabe/kirby-pure-stats
```

### Manual

Download or clone this repository into:

``` text
/site/plugins/kirby-pure-stats
```

Pure Stats will then appear as **Stats** in the Kirby Panel.

## How it works

Pure Stats tracks pageviews when Kirby renders a page.

For each pageview, it stores:

-   Date
-   Page identifier
-   Number of pageviews

The data is aggregated by date and page. Pure Stats does not create a
record for every individual visit.

Analytics data is stored locally in:

``` text
/site/stats/pure-stats.sqlite
```

The database is created automatically when the first pageview is
recorded.

## Privacy

Pure Stats is designed to collect a minimal amount of analytics data.

It does not use cookies or external analytics services. No IP addresses,
user agents or personal identifiers are stored by Pure Stats.

Logged-in Kirby Panel users are excluded from tracking.

All analytics data remains on the server running the Kirby installation.

> Pure Stats provides a privacy-conscious technical implementation, but
> its use does not automatically guarantee compliance with applicable
> privacy laws. Website operators are responsible for evaluating their
> individual legal requirements.

## Configuration

Tracking is enabled by default.

It can be disabled in your Kirby configuration:

``` php
return [
    'felix-rabe.pure-stats.enabled' => false,
];
```

## Data

The SQLite database uses a deliberately simple data model:

``` text
date + page + pageviews
```

This allows Pure Stats to provide historical statistics while avoiding
the storage of individual visitor profiles.

## License

MIT

## Credits

Pure Stats is developed by Felix Rabe.

Originally developed as part of Kirby Pure.
