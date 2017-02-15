
'use strict';

module.exports = function(kbox, app) {

  // Node
  var fs = kbox.node.fs;
  var path = require('path');
  var _ = kbox.node._;

  // Internal
  var cmd = require('./cmd.js')(kbox, app);

  /*
   * Add in relevant data from platform config files and set the appropriate
   * environment
   */
  app.events.on('post-app-load', function(app) {

    // Set the environment
    app.env.setEnvFromObj(require('./env.js')(kbox, app), 'app_platform');

    // Add in our extra services and establish links
    var services = require('./services.js')(kbox, app).services;
    var links = require('./services.js')(kbox, app).links;

    // Start a compose collector
    var compose = {};

    // If we have links lets add them to the appserver
    if (!_.isEmpty(links)) {
      compose['appserver'] = {links: links};
    }

    // If we have additional services, lets add them!
    if (!_.isEmpty(services)) {
      compose = _.merge(compose, services);
    }

    // If the CLI plugin is on lets also add our links to all of those services
    if (_.get(app.config, 'pluginconfig.cli', false) === 'on') {

      // Get CLI services
      var cliCompose = path.join(app.root, 'kalabox-cli.yml');
      var cliServices = kbox.util.yaml.toJson(cliCompose);

      // Add the linkzzz
      _.forEach(_.keys(cliServices), function(cli) {
        compose[cli] = {links: links};
      });

    }

    // Create dir to store this stuff
    var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
    fs.mkdirpSync(tmpDir);

    // Add to our services if we have it
    if (!_.isEmpty(compose)) {
      var fileName = [app.name, _.uniqueId()].join('-');
      var newComposeFile = path.join(tmpDir, fileName + '.yml');
      kbox.util.yaml.toYamlFile(compose, newComposeFile);
      app.composeCore.push(newComposeFile);
    }

  });

  /*
   * Build the site after post-start happens
   */
  app.events.on('post-start', function() {

    // Only do a build if this is the first time
    if (!fs.existsSync(path.join(app.root, 'web'))) {

      // Build the deps
      return cmd.platformBuild()

      // Get the environmental variables
      .then(function() {
        return cmd.getEnv()
      })

      // Import the database
      .then(function() {
        return cmd.importDB()
      })

      // Import the files
      .then(function() {
        return cmd.getFiles()
      })

      // Restart the app because we probably need to restart fpm
      .then(function() {
        return kbox.app.restart(app);
      });

    }

  });

  /*
   * We don't want to uninstall our data container on a rebuild
   * so remove the data container from here
   *
   * NOTE: this is a nifty implementation where we inception some events
   * to target exactly what we want
   */
  app.events.on('pre-rebuild', function() {

    // We want to edit our engine remove things
    kbox.core.events.on('pre-engine-destroy', function(data) {

      // Get our services
      var services = _.flatten(_.map(app.composeCore, function(file)  {
        return _.keys(kbox.util.yaml.toJson(file));
      }));

      // Remove the data element
      var withoutData = _.remove(services, function(service) {
        return service !== 'data';
      });

      // Update data to note remove data services on rebuilds
      data.opts = {services: withoutData};

    });

  });

  /*
   * build an object of services to use
   */
  app.events.on('services', function() {

    // Get our services module
    var services = require('./services.js')(kbox, app);

    // Get our services info
    return services.getServicesInfo()

    // And then define it
    .then(function(services) {
      app.services = services;
    });

  });

};
