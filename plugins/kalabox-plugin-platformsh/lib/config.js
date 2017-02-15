'use strict';

module.exports = function(kbox, app) {

  // Node
  var _ = kbox.node._;
  var path = require('path');
  var fs = kbox.node.fs;

  /*
   * Build a mysql connection object
   */
  var buildMysql = function(host) {
    return [
      {
        host: host || 'mysql.internal',
        password: 'platform',
        path: 'platform',
        port: 3306,
        query: {
          is_master: true
        },
        scheme: 'mysql',
        username: 'platform'
      }
    ];
  };

  /*
   * Build a redis connection object
   */
  var buildRedis = function(host) {
    return [
      {
        host: host || 'redis.internal',
        scheme: 'redis',
        port: 6379
      }
    ];
  };

  /*
   * Build a solr connection object
   */
  var buildSolr = function(host) {
    return [
      {
        path: 'solr',
        host: host || 'solr.internal',
        scheme: 'solr',
        port: 8080
      }
    ];
  };

  /*
   * Route relationship building
   */
  var buildRelationship = function(name, data) {

    // Split the type to set the service
    var service = data.split(':')[1];
    var host = [name, 'internal'].join('.');

    // Return the correct service definition
    switch (service) {
      case 'mysql': return buildMysql(host);
      case 'postgresql': return {};
      case 'mongodb': return {};
      case 'redis': return buildRedis(host);
      case 'solr': return buildSolr(host);
      case 'elasticsearch': return {};
      case 'rabbitmq': return {};
    }

  };

  /*
   * Load our platform yml if it exists
   */
  var getConfig = function() {

    // Get the config
    var cFile = path.join(app.root, '.platform.app.yaml');
    var config = fs.existsSync(cFile) ? kbox.util.yaml.toJson(cFile) : {};
    var relationships = config.relationships || {};

    // Start a connections collector
    config.connections = {};

    // Iterate through the relationships and build connections
    _.forEach(relationships, function(data, name) {
      config.connections[name] = buildRelationship(name, data);
    });

    // Return our config
    return config;

  };

  // Return the platform config
  return getConfig();

};
