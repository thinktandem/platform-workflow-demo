'use strict';

module.exports = function(kbox, app) {

  // Node
  var fs = require('fs');
  var path = require('path');

  // Commands
  var cmd = require('./cmd.js')(kbox, app);

  // Load our push and pull tasks
  app.events.on('load-tasks', function() {

    // kbox getenv
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'pullenv'];
      task.category = 'appAction';
      task.description = 'Pull down platform.sh environmental vars.';
      task.kind = 'delegate';

      // This is what we run yo!
      task.func = function() {
        return cmd.getEnv();
      };

    });

    // kbox pullfiles
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'build'];
      task.category = 'appAction';
      task.description = 'Run the platform.sh build process.';
      task.kind = 'delegate';

      // This is what we run yo!
      task.func = function() {
        return cmd.platformBuild();
      };

    });

    // kbox pulldb
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'pulldb'];
      task.category = 'appAction';
      task.description = 'Pull down database.';
      task.kind = 'delegate';

      // This is what we run yo!
      task.func = function() {
        return cmd.importDB();
      };

    });

    // kbox pullfiles
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'pullfiles'];
      task.category = 'appAction';
      task.description = 'Pull down files.';
      task.kind = 'delegate';

      // This is what we run yo!
      task.func = function() {
        return cmd.getFiles();
      };

    });

  });

};
