panel.plugin("felix-rabe/pure-stats", {
  components: {
    "k-pure-stats-view": {
      data() {
        const today = new Date();

        return {
          hovered: null,
          pageviews: [],
          firstDate: null,
          requestId: 0,
          range: "month",
          selectedYear: today.getFullYear(),
          selectedMonth: today.getMonth(),
          chartWidth: 0,
          resizeObserver: null
        };
      },

      computed: {
        today() {
          const date = new Date();
          date.setHours(0, 0, 0, 0);

          return date;
        },

        firstDataDate() {
          if (!this.firstDate) {
            return null;
          }

          return new Date(
            this.firstDate + "T00:00:00"
          );
        },

        canGoPrevious() {
          if (!this.firstDataDate) {
            return false;
          }

          if (this.range === "year") {
            return (
              this.selectedYear >
              this.firstDataDate.getFullYear()
            );
          }

          if (this.range === "month") {
            const selected =
              this.selectedYear * 12 +
              this.selectedMonth;

            const first =
              this.firstDataDate.getFullYear() * 12 +
              this.firstDataDate.getMonth();

            return selected > first;
          }

          return false;
        },

        canGoNext() {
          if (this.range === "year") {
            return (
              this.selectedYear <
              this.today.getFullYear()
            );
          }

          if (this.range === "month") {
            const selected =
              this.selectedYear * 12 +
              this.selectedMonth;

            const current =
              this.today.getFullYear() * 12 +
              this.today.getMonth();

            return selected < current;
          }

          return false;
        },

        periodLabel() {
          if (this.range === "year") {
            return String(
              this.selectedYear
            );
          }

          if (this.range === "month") {
            const date = new Date(
              this.selectedYear,
              this.selectedMonth,
              1
            );

            return new Intl.DateTimeFormat(
              "en",
              {
                month: "long",
                year: "numeric"
              }
            ).format(date);
          }

          return "";
        },

        axisStep() {
          if (this.range !== "month") {
            return 1;
          }

          if (this.chartWidth >= 1100) {
            return 1;
          }

          if (this.chartWidth >= 800) {
            return 2;
          }

          if (this.chartWidth >= 550) {
            return 5;
          }

          return 10;
        },

        filteredTotal() {
          return this.pageviews.reduce(
            (sum, item) =>
              sum + Number(item.hits),
            0
          );
        },

        tablePageviews() {
          if (!this.hovered) {
            return this.pageviews;
          }

          /*
           * THIS YEAR
           * Hover filters the table by month
           */
          if (this.range === "year") {
            const month =
              this.hovered.date.slice(0, 7);

            return this.pageviews.filter(
              item =>
                item.date.slice(0, 7) === month
            );
          }

          /*
           * THIS MONTH / LAST 7 DAYS
           * Hover filters the table by day
           */
          return this.pageviews.filter(
            item =>
              item.date === this.hovered.date
          );
        },

        filteredPages() {
          const pages = {};

          this.tablePageviews.forEach(
            item => {
              if (!pages[item.page]) {
                pages[item.page] = 0;
              }

              pages[item.page] +=
                Number(item.hits);
            }
          );

          return Object.entries(pages)
            .map(([page, hits]) => ({
              page,
              hits
            }))
            .filter(
              item => item.hits > 0
            )
            .sort(
              (a, b) =>
                b.hits - a.hits
            );
        },

        chartData() {
          const values = {};

          this.pageviews.forEach(
            item => {
              values[item.date] =
                (values[item.date] || 0) +
                Number(item.hits);
            }
          );

          /*
           * THIS YEAR
           * One bar per month
           */
          if (this.range === "year") {
            const result = [];

            const lastMonth = 11;

            for (
              let month = 0;
              month <= lastMonth;
              month++
            ) {
              let hits = 0;

              this.pageviews.forEach(
                item => {
                  const date =
                    new Date(
                      item.date +
                        "T00:00:00"
                    );

                  if (
                    date.getMonth() ===
                    month
                  ) {
                    hits +=
                      Number(item.hits);
                  }
                }
              );

              const date =
                new Date(
                  this.selectedYear,
                  month,
                  1
                );

              const dateString =
                this.toDateString(date);

              result.push({
                date: dateString,
                label:
                  this.formatMonth(
                    dateString
                  ),
                tooltip:
                  this.formatMonthLong(
                    dateString
                  ) +
                  " " +
                  this.selectedYear,
                hits,
                future:
                  this.selectedYear ===
                    this.today.getFullYear() &&
                  month >
                    this.today.getMonth()
              });
            }

            return result;
          }

          /*
           * THIS MONTH
           * One bar per day
           */
          if (this.range === "month") {
            const result = [];

            const lastDay =
              new Date(
                this.selectedYear,
                this.selectedMonth + 1,
                0
              ).getDate();

            for (
              let day = 1;
              day <= lastDay;
              day++
            ) {
              const dateObject =
                new Date(
                  this.selectedYear,
                  this.selectedMonth,
                  day
                );

              const date =
                this.toDateString(
                  dateObject
                );

              result.push({
                date,
                label:
                  this.formatDayMonth(
                    date
                  ),
                tooltip:
                  this.formatDate(date),
                hits:
                  values[date] ?? 0,
                future:
                  this.selectedYear ===
                    this.today.getFullYear() &&
                  this.selectedMonth ===
                    this.today.getMonth() &&
                  day >
                    this.today.getDate()
              });
            }

            return result;
          }

          /*
           * LAST 7 DAYS
           * One bar per day
           */
          if (this.range === "week") {
            const result = [];

            const current =
              new Date(this.today);

            current.setDate(
              current.getDate() - 6
            );

            while (
              current <= this.today
            ) {
              const date =
                this.toDateString(
                  current
                );

              result.push({
                date,
                label:
                  this.formatDayMonth(
                    date
                  ),
                tooltip:
                  this.formatDate(date),
                hits:
                  values[date] ?? 0
              });

              current.setDate(
                current.getDate() + 1
              );
            }

            return result;
          }

          return [];
        },

        maxHits() {
          return Math.max(
            ...this.chartData.map(
              item =>
                Number(item.hits)
            ),
            1
          );
        }
      },

      methods: {
        getDateRange() {
          if (this.range === "year") {
            return {
              from:
                this.selectedYear +
                "-01-01",
              to:
                this.selectedYear +
                "-12-31"
            };
          }

          if (this.range === "month") {
            const from = new Date(
              this.selectedYear,
              this.selectedMonth,
              1
            );

            const to = new Date(
              this.selectedYear,
              this.selectedMonth + 1,
              0
            );

            return {
              from:
                this.toDateString(from),
              to:
                this.toDateString(to)
            };
          }

          const to =
            new Date(this.today);

          const from =
            new Date(this.today);

          from.setDate(
            from.getDate() - 6
          );

          return {
            from:
              this.toDateString(from),
            to:
              this.toDateString(to)
          };
        },

        async loadPageviews() {
          const requestId =
            ++this.requestId;

          const dates =
            this.getDateRange();

          this.hovered = null;

          try {
            const response =
              await this.$api.get(
                "pure-stats",
                dates
              );

            if (
              requestId !==
              this.requestId
            ) {
              return;
            }

            this.pageviews =
              Array.isArray(
                response.pageviews
              )
                ? response.pageviews
                : [];

            this.firstDate =
              response.firstDate ||
              null;
          } catch (error) {
            if (
              requestId !==
              this.requestId
            ) {
              return;
            }

            this.pageviews = [];
          }
        },

        setRange(range) {
          this.range = range;

          if (range === "year") {
            this.selectedYear =
              this.today.getFullYear();
          }

          if (range === "month") {
            this.selectedYear =
              this.today.getFullYear();

            this.selectedMonth =
              this.today.getMonth();
          }

          this.hovered = null;

          this.loadPageviews();
        },

        previousPeriod() {
          if (!this.canGoPrevious) {
            return;
          }

          if (this.range === "year") {
            this.selectedYear--;
          }

          if (this.range === "month") {
            this.selectedMonth--;

            if (
              this.selectedMonth < 0
            ) {
              this.selectedMonth = 11;
              this.selectedYear--;
            }
          }

          this.hovered = null;

          this.loadPageviews();
        },

        nextPeriod() {
          if (!this.canGoNext) {
            return;
          }

          if (this.range === "year") {
            this.selectedYear++;
          }

          if (this.range === "month") {
            this.selectedMonth++;

            if (
              this.selectedMonth > 11
            ) {
              this.selectedMonth = 0;
              this.selectedYear++;
            }
          }

          this.hovered = null;

          this.loadPageviews();
        },

        showAxisLabel(index) {
          if (
            this.range !== "month"
          ) {
            return true;
          }

          if (
            index === 0 ||
            index ===
              this.chartData.length - 1
          ) {
            return true;
          }

          return (
            index %
              this.axisStep ===
            0
          );
        },

        toDateString(date) {
          return (
            date.getFullYear() +
            "-" +
            String(
              date.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
              date.getDate()
            ).padStart(2, "0")
          );
        },

        formatDate(date) {
          return new Intl.DateTimeFormat(
            "en-GB",
            {
              day: "numeric",
              month: "short",
              year: "numeric"
            }
          ).format(
            new Date(
              date +
                "T00:00:00"
            )
          );
        },

        formatDayMonth(date) {
          const d =
            new Date(
              date +
                "T00:00:00"
            );

          return (
            String(
              d.getDate()
            ).padStart(2, "0") +
            "." +
            String(
              d.getMonth() + 1
            ).padStart(2, "0") +
            "."
          );
        },

        formatMonth(date) {
          return new Intl.DateTimeFormat(
            "en",
            {
              month: "short"
            }
          ).format(
            new Date(
              date +
                "T00:00:00"
            )
          );
        },

        formatMonthLong(date) {
          return new Intl.DateTimeFormat(
            "en",
            {
              month: "long"
            }
          ).format(
            new Date(
              date +
                "T00:00:00"
            )
          );
        }
      },

      mounted() {
        this.loadPageviews();

        const chart =
          this.$refs.chart;

        if (!chart) {
          return;
        }

        this.resizeObserver =
          new ResizeObserver(
            entries => {
              const entry =
                entries[0];

              if (entry) {
                this.chartWidth =
                  entry.contentRect.width;
              }
            }
          );

        this.resizeObserver.observe(
          chart
        );
      },

      beforeUnmount() {
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
        }
      },

      template: `
        <k-panel-inside>

          <k-header>
            Stats
          </k-header>

          <div class="pure-stats-toolbar">

            <div class="pure-stats-period-nav">

              <template
                v-if="range === 'year' || range === 'month'"
              >
                <button
                  class="pure-stats-period-button"
                  :disabled="!canGoPrevious"
                  @click="previousPeriod"
                >
                  ‹
                </button>

                <span class="pure-stats-period-label">
                  {{ periodLabel }}
                </span>

                <button
                  class="pure-stats-period-button"
                  :disabled="!canGoNext"
                  @click="nextPeriod"
                >
                  ›
                </button>
              </template>

            </div>

            <div class="pure-stats-range">

              <button
                :class="{ active: range === 'year' }"
                @click="setRange('year')"
              >
                This Year
              </button>

              <button
                :class="{ active: range === 'month' }"
                @click="setRange('month')"
              >
                This Month
              </button>

              <button
                :class="{ active: range === 'week' }"
                @click="setRange('week')"
              >
                Last 7 Days
              </button>

            </div>

          </div>

          <div class="pure-stats-total">
            <strong>
              {{ filteredTotal }}
            </strong>

            <span>
              Pageviews
            </span>
          </div>

          <section class="pure-stats-section">

            <div
              ref="chart"
              class="pure-stats-chart-wrapper"
            >

              <div
                v-if="hovered"
                class="pure-stats-tooltip"
              >
                <strong>
                  {{ hovered.tooltip }}
                </strong>

                <span>
                  {{ hovered.hits }}
                  Pageviews
                </span>
              </div>

              <div class="pure-stats-chart">

                <div
                  v-for="(item, index) in chartData"
                  :key="
                    range +
                    '-' +
                    selectedYear +
                    '-' +
                    selectedMonth +
                    '-' +
                    item.date
                  "
                  class="pure-stats-bar"
                  :class="{
                    'is-zero':
                      Number(item.hits) === 0,
                    'is-future':
                      item.future
                  }"
                  @mouseenter="
                    Number(item.hits) > 0 &&
                    !item.future &&
                    (hovered = item)
                  "
                  @mouseleave="
                    hovered = null
                  "
                >
                  <div
                    class="pure-stats-bar-value"
                    :style="{
                      height:
                        (
                          Number(item.hits) /
                          maxHits *
                          100
                        ) + '%',
                      animationDelay:
                        (index * 20) +
                        'ms'
                    }"
                  />
                </div>

              </div>

              <div class="pure-stats-axis">

                <span
                  v-for="(item, index) in chartData"
                  :key="item.date"
                  class="pure-stats-axis-label"
                >
                  {{
                    showAxisLabel(index)
                      ? item.label
                      : ''
                  }}
                </span>

              </div>

            </div>

          </section>

          <section class="pure-stats-section">

            <div class="pure-stats-table">
              <div class="pure-stats-table-header">
                <span>Page</span>
                <span>Pageviews</span>
              </div>

              <div
                v-for="item in filteredPages"
                :key="item.page"
                class="pure-stats-table-row"
              >
                <span class="pure-stats-table-page">
                  {{ item.page }}
                </span>

                <span class="pure-stats-table-hits">
                  {{ item.hits }}
                </span>
              </div>
            </div>

          </section>

        </k-panel-inside>
      `
    }
  }
});