'use strict';

module.exports = function(kbox, app) {

  // Node
  var _ = kbox.node._;
  var crypto = require('crypto');
  var fs = kbox.node.fs;
  var links = require('./services.js')(kbox, app).links;
  var path = require('path');

  /*
   * Base 64 encode data
   */
  var base64 = function(data) {
    return Buffer(JSON.stringify(data)).toString('base64');
  };

  /*
   * Get our ENV
   */
  var getEnv = function() {

    // Platform conf
    var config = require('./config.js')(kbox, app);
    var routes = require('./routes.js')(kbox, app);
    var services = require('./services.js')(kbox, app).services;

    // Some local env conf
    var userConf = kbox.core.deps.get('globalConfig').userConfRoot;
    var envCache = path.join(userConf, 'platform.sh', 'environment');
    var envFile = path.join(envCache, app.name);

    // Create a hash to compute some entropy
    var getHash = function(u) {
      return crypto.createHash('sha256').update(u).digest('hex');
    };

    // Default environmental variables
    var env = {
      appDir: '/code',
      application: base64(config),
      applicationName: config.name || app.name,
      branch: 'master',
      documentRoot: '/code/web/',
      environment: 'kalabox',
      project: 'l7yb6txhpe53g',
      relationships: base64(config.connections),
      variables: base64({}),
      routes: JSON.stringify(routes),
      treeId: 'todo',
      projectEntropy: getHash(JSON.stringify(routes)),
      appserverImage: services.appserver.image
    };

    // Add service host info
    _.forEach(links, function(link) {
      var service = link.split(':');
      env[service[0] + 'Host'] = service[1];
    });

    // Add environmental variables if applicable
    if (fs.existsSync(envFile)) {
      env.variables = fs.readFileSync(envFile, {encoding: 'utf8'});
    }

    return env;

  };

  // Return the ENV
  return getEnv();

};
