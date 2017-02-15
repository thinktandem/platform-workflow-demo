'use strict';

module.exports = function(kbox, app) {

  // Node
  var _ = kbox.node._;
  var path = require('path');
  var Promise = kbox.Promise;
  var fs = kbox.node.fs;

  /*
   * Parse relationships
   */
  var getLinks = function() {

    // Grab the relaitonships
    var relationships = require('./config.js')(kbox, app).relationships || {};

    // Loops through relationships and construct them properly
    return _.map(relationships, function(service, key) {
      return service.split(':')[0] + ':' + key + '.internal';
    });

  };

  /*
   * Parse PHP
   */
  var parsePhp = function(data) {

    // Get some conf from our data
    var version = data.type.split(':')[1].split('.').join('') || 56;

    return {
      image: 'kalabox/pantheon-appserver:' + version,
      links: getLinks()
    }

  }

  /*
   * Parse MySQL
   */
  var parseMySql = function(data) {

    // Get some conf from our data
    var version = data.type.split(':')[1] || '10';

    // MySQL service
    return {
      image: 'mariadb:' + version,
      environment: {
        'MYSQL_USER': 'platform',
        'MYSQL_PASSWORD': 'platform',
        'MYSQL_ALLOW_EMPTY_PASSWORD': 'yes',
        'MYSQL_DATABASE': 'platform',
      },
      ports: ['3306'],
      volumes: [
        '$KALABOX_APP_ROOT_BIND:/src',
        '$KALABOX_APP_ROOT_BIND/config/mysql:/etc/mysql/conf.d'
      ],
      'volumes_from': ['data']
    }

  };

  /*
   * Parse Redis
   */
  var parseRedis = function(data) {

    // Get some conf from our data
    var version = data.type.split(':')[1] || '2.8';

    // Redis
    return {
      image: 'redis:' + version,
      volumes: [
        '$KALABOX_APP_ROOT_BIND:/src'
      ],
      command: 'redis-server --appendonly yes'
    }

  };

  /*
   * Parse solr
   */
  var parseSolr = function(data) {

    // Port to use
    var port = '8080';

    // Config version differences
    var versionConfig = {
      '3.6': {
        port: port,
        confDir: '/opt/solr/example/solr/conf',
        command: '/bin/bash -c "cd /opt/solr/example; java -Djetty.port=' + port + ' -jar start.jar"'
      },
      '4.10': {
        port: port,
        confDir: '/opt/solr-4.10.4/example/solr/collection1/conf/',
        command: '/bin/bash -c "/opt/solr/bin/solr -f -p ' + port + '"'
      }
    };

    // Get some conf from our data
    var version = data.type.split(':')[1] || '4.10';
    var config = versionConfig[version];

    // Get our solrConf directory
    var solrConf = _.get(data, 'configuration.core_config', 'solr/conf');

    // Solr
    return {
      image: 'actency/docker-solr:' + version,
      volumes: [
        '$KALABOX_APP_ROOT_BIND:/src',
        '$KALABOX_APP_ROOT_BIND/.platform/' + solrConf + ':' + config.confDir
      ],
      expose: [config.port],
      command: config.command
    }

  };

  /*
   * Route service parsing
   */
  var parseService = function(data) {

    // Split the type to set the service
    var service = data.type.split(':')[0];

    // Return the correct service definition
    switch (service) {
      case 'php': return parsePhp(data);
      case 'hhvm': return {};
      case 'nodejs': return {};
      case 'python': return {};
      case 'ruby': return {};
      case 'mysql': return parseMySql(data);
      case 'postgresql': return {};
      case 'mongodb': return {};
      case 'redis': return parseRedis(data);
      case 'solr': return parseSolr(data);
      case 'elasticsearch': return {};
      case 'rabbitmq': return {};
    }

  };

  /*
   * Get our platform services yml if it exists
   */
  var getServices = function() {

    // Get the config so we can learn about the app container
    var application = require('./config.js')(kbox, app).type || 'php:7.0';

    // Get the rest of the services
    var sFile = path.join(app.root, '.platform', 'services.yaml');
    var services = fs.existsSync(sFile) ? kbox.util.yaml.toJson(sFile) : {};

    // Add the application to the services
    services['appserver'] = {type: application};

    // Iterate through the services and construct a compose object
    _.forEach(services, function(data, name) {
      services[name] = parseService(data);
    });

    // Return our services
    return services;

  };

  /*
   * Helper to parse services data into urls
   */
  var getServiceUrls = function(services) {

    return _.map(services, function(service) {

      // Start with a hostnames collector
      var hostnames = [];

      // Handle 'default' key
      if (service.default) {
        hostnames.push(app.name);
      }

      // Handle legacy 'hostname' key
      if (service.hostname) {
        hostnames.push([service.hostname, app.name].join('.'));
      }

      // Handle 'subdomains'
      if (service.subdomains) {
        _.forEach(service.subdomains, function(subdomain) {
          hostnames.push([subdomain, app.name].join('.'));
        });
      }

      // Handle 'custom'
      if (service.custom) {
        _.forEach(service.custom, function(url) {
          hostnames.push(url);
        });
      }

      // Determine whether the protocol is http or https
      var protocol = (service.secure) ? 'https://' : 'http://';

      // Return an array of parsed hostnames
      return _.map(hostnames, function(hostname) {
        return protocol + [hostname, app.domain].join('.');
      });

    });

  };

  /*
   * Helper to generate a summary from inspect data
   */
  var getServiceSummary = function(container) {

    // Inspect the container
    return kbox.engine.inspect(container)

    // Return summary of info
    .then(function(data) {

      // Get service name =
      var name = data.Config.Labels['com.docker.compose.service'];
      var project = data.Config.Labels['com.docker.compose.project'];

      // Defaults
      var serviceSummary = {
        name: name,
        project: project
      };

      // Get our config info
      var config = kbox.util.yaml.toJson(path.join(app.root, 'kalabox.yml'));

      // See if these are proxied services
      var proxied = _.find(config.pluginconfig.services, function(data, key) {
        return key === name;
      });
      if (!_.isEmpty(proxied)) {
        serviceSummary.url = _.flatten(getServiceUrls(proxied));
      }

      // Check if this container is also a non-appserver service so we can add
      // any relevant connection info to it
      if (name !== 'appserver' && _.includes(_.keys(getServices()), name)) {

        // Get list of services
        var relationships = require('./config.js')(kbox, app).relationships;

        // Get the relationship
        var relationship = _.findKey(relationships, function(service) {
          return service.split(':')[0] === name;
        });

        // If we have a relationship, lets build a connection
        if (!_.isEmpty(relationship)) {

          // Get all the connections
          var connections = require('./config.js')(kbox, app).connections;
          var connection = connections[relationship][0];

          // Add the internal connection info to the summary
          serviceSummary.internal_connection_info = connection;

          // Add external connection info if applicable
          if (!_.isEmpty(data.HostConfig.PortBindings)) {

            // Get our exposed data
            var ports = data.NetworkSettings.Ports;
            var exposed = ports[connection.port + '/tcp'][0] || {};

            // If we have exposed data that is external lets add an
            // external connection
            if (!_.isEmpty(exposed) && exposed.HostIp === '0.0.0.0') {

              // Override the host and port from the internal
              connection.host = [app.name, app.domain].join('.');
              connection.port = exposed.HostPort;

              // Start with the internal information
              serviceSummary.external_connection_info = connection;

            }

          }

        }

      }

      return serviceSummary;

    });

  };

  /*
   * Helper to get connection info about our services
   */
  var getServicesInfo = function() {

    // Check if our engine is up
    return kbox.engine.isUp()

    // If we are up check for containers running for an app
    // otherwise return false
    .then(function(isUp) {

      // Engine is up so lets check if the app has running containers
      if (isUp) {

        // Get list of containers
        return kbox.engine.list(app.name)

        // Return running containers
        .filter(function(container) {
          return kbox.engine.isRunning(container.id);
        });

      }

      // Engine is down so nothing can be running
      else {
        return {};
      }

    })

    // Generate information about services if we can
    .then(function(runningServices) {
      if (_.isEmpty(runningServices)) {
        return 'App is not running.';
      }
      else {
        return Promise.map(runningServices, function(service) {
          return getServiceSummary(service);
        });
      }
    });

  };

  // Get services
  return {
    services: getServices(),
    links: getLinks(),
    getServicesInfo: getServicesInfo
  };

};
