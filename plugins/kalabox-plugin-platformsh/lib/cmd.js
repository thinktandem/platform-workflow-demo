'use strict';

module.exports = function(kbox, app) {

  // node modules
  var format = require('util').format;
  var os = require('os');
  var path = require('path');

  // kbox modules
  var _ = kbox.node._;
  var fs = kbox.node.fs;
  var log = kbox.core.log.make('PLATFORM CMD RUN');
  var Promise = kbox.Promise;

  /*
   * Platform cli container def
   */
  var platformContainer = function() {
    return {
      compose: app.composeCore,
      project: app.name,
      opts: {
        mode: kbox.core.deps.get('mode') === 'gui' ? 'collect' : 'attach',
        services: ['platformcli'],
        app: app
      }
    };
  };

  /*
   * Helper to run commands on a container
   */
  var run = function(entrypoint, cmd, service) {

    // Build run definition
    var runDef = service || platformContainer();
    runDef.opts.entrypoint = entrypoint;
    runDef.opts.cmd = cmd;

    // Log the run
    log.info(format(
      'Running %s using %s with %j for app %s ',
      cmd,
      entrypoint,
      runDef.compose,
      runDef.project
    ));

    return kbox.Promise.retry(function() {
      app.env.setEnv('KALABOX_CLI_WORKING_DIR', '/code');
      return kbox.engine.run(runDef);
    });
  };

  /*
   * Build out the platform dependencies
   */
  var platformBuild = function() {

    // Platform build cmd
    var cmd = [
      'platform',
      'build',
      '--source',
      '/src',
      '--destination',
      '/src/web',
      '-y',
      '-v'
    ];

    // Display status and run
    app.status('Running platform.sh app build.');
    return run('usermap', cmd, platformContainer());

  };

  /*
   * Run Import DB command
   */
  var importDB = function() {

    // Import the DB
    var dbImport = [
      'platform',
      '--project=$PLATFORM_PROJECT',
      '--environment=master',
      '--stdout',
      'db:dump',
      '|',
      'mysql',
      '-A',
      '-u',
      'platform',
      '-pplatform',
      '-h',
      '$MYSQL_HOST',
      'platform'
    ];

    // Clear our caches
    var cc = [
      'drush',
      '@kbox',
      'cr',
      '-y'
    ];

    // Import the database
    app.status('Importing database.');
    return run('usermap', dbImport, platformContainer())

    // Import the files
    .then(function() {
      app.status('Clearing caches and rebuilding registry');
      return run('usermap', cc, platformContainer());
    });

  };

  /*
   * Get files
   */
  var getFiles = function() {

    // Base command
    var cmd = [
      '-rlvz',
      '--size-only',
      '--ipv4',
      '--progress',
      '--exclude',
      'js',
      '--exclude',
      'css',
      '--exclude',
      'ctools',
      '--exclude',
      'imagecache',
      '--exclude',
      'xmlsitemap',
      '--exclude',
      'backup_migrate',
      '--exclude',
      'styles'
    ];

    // Add source and destination
    cmd.push('`platform environment:ssh --project=$PLATFORM_PROJECT ' +
      ' --environment=master --pipe`:web/sites/default/files/*');
    cmd.push('/code/web/sites/default/files');

    // Run the command
    cmd.unshift('rsync');
    app.status('Importing files.');
    return run('usermap', cmd, platformContainer());
  };

  /*
   * Get the platform envvars
   */
  var getEnv = function() {

    // Unique file to save
    var envFile = _.uniqueId(app.name) + '.csv';

    // Platform build cmd
    var cmd = [
      'platform',
      'variables',
      '--project=$PLATFORM_PROJECT',
      '--environment=master',
      '--format=csv',
      '-y',
      '>',
      '/home/root/.platformsh/' + envFile
    ];

    // Display status and run
    app.status('Getting environmental variables from platform.');
    return run('usermap', cmd, platformContainer())

    // Load up the file, parse it into JSON and add it to ~/.kalabox/platform
    .then(function() {

      // Load the file
      var home = kbox.core.deps.get('globalConfig').home;
      var envPath = path.join(home, '.platformsh', envFile);
      var rawEnv = fs.readFileSync(envPath, {encoding: 'utf8'});

      // Parse the CSV into an array
      var variables = rawEnv.split(os.EOL);

      // Remove the headers
      variables.shift();

      // Start up a collector
      var env = {};

      // Iterate through our parts and add them to the collector
      _.forEach(variables, function(variable) {

        // Filter out any nulls
        if (!_.isEmpty(variable)) {

          // Get all the pieces
          var key = variable.split(',')[0];
          var value = variable.split(',')[1];
          var isInherited = variable.split(',')[2] === 'Yes';
          var isJson = variable.split(',')[3] === 'Yes';

          // Parse value if is json
          if (isJson) {
            value = JSON.parse(value);
          }

          // Add to the env
          env[key] = value;

        }

      });

      // Ensure that env cache directory exists
      var userConf = kbox.core.deps.get('globalConfig').userConfRoot;
      var envCache = path.join(userConf, 'platform.sh', 'environment');
      fs.mkdirpSync(envCache);

      // Base64 encode the data and then export
      var data = Buffer(JSON.stringify(env)).toString('base64');
      fs.writeFileSync(path.join(envCache, app.name), data);

    });

  };


  // Return our things
  return {
    importDB: importDB,
    platformBuild: platformBuild,
    getEnv: getEnv,
    getFiles: getFiles
  };

};
