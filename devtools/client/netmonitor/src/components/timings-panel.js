/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { DOM, PropTypes } = require("devtools/client/shared/vendor/react");
const { L10N } = require("../utils/l10n");
const { getNetMonitorTimingsURL } = require("../utils/mdn-utils");

// Components
const MDNLink = require("./mdn-link");

const { div, span } = DOM;
const types = ["serviceWorkerPreparation",
               "requestToServiceWorker",
               "handledByServiceWorker",
               "blocked",
               "dns",
               "connect",
               "send",
               "wait",
               "receive"];
const TIMINGS_END_PADDING = "80px";

/*
 * Timings panel component
 * Display timeline bars that shows the total wait time for various stages
 */
function TimingsPanel({ request }) {
  if (!request.eventTimings) {
    return null;
  }

  const details = request.eventTimings.details;
  const bounds = types.filter(t => details[t]).reduce((acc, cur) => {
    return {
      min: Math.min(acc.min, details[cur].start),
      max: Math.max(acc.max, details[cur].end)
    };
  }, {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY});

  const totalTime = bounds.max - bounds.min;

  const timings = types.filter(t => details[t]).map(t => {
    return {
      type: t,
      string: (details[t].end - details[t].start) / 1000,
      offset: (details[t].start - bounds.min) / totalTime,
      timeline: (details[t].end - details[t].start) / totalTime
    };
  });

  const timelines = timings.map(timing => {
    return div({
      key: timing.type,
      id: `timings-summary-${timing.type}`,
      className: "tabpanel-summary-container timings-container",
    },
      span({ className: "tabpanel-summary-label timings-label" },
        L10N.getStr(`netmonitor.timings.${timing.type}`)
      ),
      div({ className: "requests-list-timings-container" },
        span({
          className: "requests-list-timings-offset",
          style: {
            width: `calc(${timing.offset} * (100% - ${TIMINGS_END_PADDING})`,
          },
        }),
        span({
          className: `requests-list-timings-box ${timing.type}`,
          style: {
            width: `calc(${timing.timeline} * (100% - ${TIMINGS_END_PADDING}))`,
          },
        }),
        span({ className: "requests-list-timings-total" },
          L10N.getFormatStr("networkMenu.totalMS", timing.string)
        )
      ),
    );
  });

  return (
    div({ className: "panel-container" },
      timelines,
      MDNLink({
        url: getNetMonitorTimingsURL(),
      }),
    )
  );
}

TimingsPanel.displayName = "TimingsPanel";

TimingsPanel.propTypes = {
  request: PropTypes.object.isRequired,
};

module.exports = TimingsPanel;
