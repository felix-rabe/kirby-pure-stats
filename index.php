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

    'areas' => [
        'stats' => function ($kirby) {

            /*
             * Load raw pageview data
             */
            $getPageviews = function () use ($kirby): array {
                try {
                    $db = pureStatsDatabase($kirby, false);

                    if ($db === null) {
                        return [];
                    }

                    $statement = $db->query(
                        'SELECT
                            date,
                            page,
                            hits
                         FROM pageviews
                         ORDER BY
                            date ASC,
                            page ASC'
                    );

                    if ($statement === false) {
                        return [];
                    }

                    return $statement->fetchAll(PDO::FETCH_ASSOC);
                } catch (Throwable $error) {
                    return [];
                }
            };

            return [
                'label' => 'Stats',
                'icon'  => 'chart',
                'menu'  => true,
                'link'  => 'stats',

                'views' => [
                    [
                        'pattern' => 'stats',

                        'action' => function () use ($getPageviews) {
                            return [
                                'component' =>
                                    'k-pure-stats-view',

                                'title' =>
                                    'Stats',

                                'props' => [
                                    'pageviews' =>
                                        $getPageviews(),
                                ],
                            ];
                        },
                    ],
                ],
            ];
        },
    ],
]);