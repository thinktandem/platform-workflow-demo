#!/bin/bash
set -e

# Set defaults
: ${KALABOX_SSH_KEY:='id_rsa'}

# Make KEY DIR
mkdir -p "/root/.ssh"

# Make sure we explicitly set the default ssh key to be used for all SSH commands to Pantheon endpoints
cat > "/root/.ssh/config" <<EOF
Host *platform.sh
  User root
  StrictHostKeyChecking no
  IdentityFile /root/.ssh/$KALABOX_SSH_KEY
EOF
chmod 644 /root/.ssh/config

# Check for our ssh key and move it over to the correct location
# We need to do this because VB SHARING ON WINDOZE sets the original key to have
# 777 permissions since it is in a shared directory
if [ -f "/home/root/keys/${KALABOX_SSH_KEY}" ]; then
  cp -rf "/home/root/keys/${KALABOX_SSH_KEY}" "/root/.ssh/$KALABOX_SSH_KEY"
  chmod 700 "/root/.ssh"
  chmod 600 "/root/.ssh/$KALABOX_SSH_KEY"
  chown -Rf root:root "/root/.ssh"
fi

# If we have a composer installed drush lets symlink that to a common path
if [ -f "/composer/vendor/drush/drush/drush" ]; then
  ln -sf /composer/vendor/drush/drush/drush /usr/local/bin/drush
fi

# Run the command
su -s "/bin/bash" -m -c "$(echo $@)" root
