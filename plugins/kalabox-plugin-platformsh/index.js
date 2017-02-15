'use strict';

module.exports = function(kbox, app) {
  // Load events
  require('./lib/events.js')(kbox, app);
  // Load tasks
  require('./lib/tasks.js')(kbox, app);
};
