<?php

use Kirby\Cms\App as Kirby;
use Kirby\Toolkit\Dir;

/**
 * Opens the Pure Stats SQLite database.
 *
 * Returns null when SQLite isn't available or the database
 * cannot be opened. This keeps analytics failures from
 * affecting the website or Panel.
 */
function pureStatsDatabase(Kirby $kirby, bool $create = true): ?PDO
{
    if (
        extension_loaded('pdo_sqlite') === false ||
        in_array('sqlite', PDO::getAvailableDrivers(), true) === false
    ) {
        return null;
    }

    $storage = $kirby->root('site') . '/stats';
    $database = $storage . '/pure-stats.sqlite';

    if ($create === false && file_exists($database) === false) {
        return null;
    }

    try {
        if ($create === true) {
            Dir::make($storage);
        }

        $db = new PDO('sqlite:' . $database);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        if ($create === true) {
            $db->exec(
                'CREATE TABLE IF NOT EXISTS pageviews (
                    date TEXT NOT NULL,
                    page TEXT NOT NULL,
                    hits INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (date, page)
                )'
            );
        }

        return $db;
    } catch (Throwable $error) {
        return null;
    }
}

/**
 * Checks a YYYY-MM-DD date used by the stats API.
 */
function pureStatsValidDate(?string $date): bool
{
    if ($date === null) {
        return false;
    }

    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);

    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

/**
 * Loads only the rows needed for the requested date range.
 */
function pureStatsPageviews(Kirby $kirby, string $from, string $to): array
{
    try {
        $db = pureStatsDatabase($kirby, false);

        if ($db === null) {
            return [];
        }

        $statement = $db->prepare(
            'SELECT
                date,
                page,
                hits
             FROM pageviews
             WHERE date >= :from
               AND date <= :to
             ORDER BY
                date ASC,
                page ASC'
        );

        $statement->execute([
            ':from' => $from,
            ':to'   => $to,
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $error) {
        return [];
    }
}

/**
 * Returns the first day for which Pure Stats has data.
 */
function pureStatsFirstDate(Kirby $kirby): ?string
{
    try {
        $db = pureStatsDatabase($kirby, false);

        if ($db === null) {
            return null;
        }

        $statement = $db->query(
            'SELECT MIN(date) FROM pageviews'
        );

        if ($statement === false) {
            return null;
        }

        $date = $statement->fetchColumn();

        return is_string($date) && $date !== '' ? $date : null;
    } catch (Throwable $error) {
        return null;
    }
}

Kirby::plugin('felix-rabe/pure-stats', [
    'options' => [
        'enabled' => true,
    ],

    'hooks' => [
        'page.render:after' => function (
            string $contentType,
            array $data,
            string $html,
            $page
        ) {
            if (option('felix-rabe.pure-stats.enabled', true) !== true) {
                return $html;
            }

            // Never count logged-in Kirby users
            if ($this->user(null, false) !== null) {
                return $html;
            }

            try {
                $db = pureStatsDatabase($this);

                if ($db === null) {
                    return $html;
                }

                $statement = $db->prepare(
                    'INSERT INTO pageviews (date, page, hits)
                     VALUES (:date, :page, 1)
                     ON CONFLICT(date, page)
                     DO UPDATE SET hits = hits + 1'
                );

                $statement->execute([
                    ':date' => date('Y-m-d'),
                    ':page' => $page->id(),
                ]);
            } catch (Throwable $error) {
                // Stats must never break the rendered website.
            }

            return $html;
        },
    ],

    'api' => [
        'routes' => function ($kirby) {
            return [
                [
                    'pattern' => 'pure-stats',
                    'method'  => 'GET',
                    'action'  => function () use ($kirby) {
                        $query = $kirby->request()->query();
                        $from = $query->get('from');
                        $to = $query->get('to');

                        if (
                            pureStatsValidDate($from) === false ||
                            pureStatsValidDate($to) === false ||
                            $from > $to
                        ) {
                            return [
                                'pageviews' => [],
                                'firstDate' => pureStatsFirstDate($kirby),
                            ];
                        }

                        return [
                            'pageviews' => pureStatsPageviews($kirby, $from, $to),
                            'firstDate' => pureStatsFirstDate($kirby),
                        ];
                    },
                ],
            ];
        },
    ],

    'areas' => [
        'stats' => function ($kirby) {
            return [
                'label' => 'Stats',
                'icon'  => 'chart',
                'menu'  => true,
                'link'  => 'stats',

                'views' => [
                    [
                        'pattern' => 'stats',

                        'action' => function () {
                            return [
                                'component' =>
                                    'k-pure-stats-view',

                                'title' =>
                                    'Stats',
                            ];
                        },
                    ],
                ],
            ];
        },
    ],
]);
