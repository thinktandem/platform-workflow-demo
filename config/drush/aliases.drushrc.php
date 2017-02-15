<?php
/**
 * This file is automatically updated by kalabox-plugin-drush.
 */
$aliases['kbox'] = array(
  'uri' => 'localhost',
  'root' => '/code/web',
  'databases' =>
    array (
      'default' =>
        array (
          'default' =>
            array (
              'driver' => 'mysql',
              'username' => 'platform',
              'password' => 'platform',
              'port' => 3306,
              'host' => getenv('MYSQL_HOST'),
              'database' => 'platform',
            ),
        ),
    ),
);
