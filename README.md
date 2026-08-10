# Kirby Pure Stats

Page-view stats for websites running with Kirby CMS.

On each page visit, it stores the page identifier and the date in a local SQLite database and visualizes this data in the Kirby Panel.

No IPs.  
No campaigns.  
No funnels.  
No bot filtering.  
No cookies.  
No identification.  
Pure stats.

![Kirby Pure Stats Panel](assets/pure-stats-panel.png)

## Installation

Download or clone this repository into:

`site/plugins/kirby-pure-stats`

Pure Stats will then appear as “Stats” in the Kirby Panel Navigation.

## Features

- Data is stored in `site/stats/pure-stats.sqlite`
- Logged-in Kirby Panel users are excluded from the stats

## License

MIT © 2026 Felix Rabe