'use strict';

module.exports = function(kbox, app) {

  // Node
  var path = require('path');
  var fs = kbox.node.fs;

  /*
   * Load our platform routes yml if it exists
   */
  var getRoutes = function() {
    var rConf = path.join(app.root, '.platform', 'routes.yaml');
    return fs.existsSync(rConf) ? kbox.util.yaml.toJson(rConf) : {};
  };

  // Return the routes
  return getRoutes();

};
