# Platformsh platformcli mock for Kalabox
#
# docker build -t kalabox/platformcli .
#

FROM drush/drush:8-php5

# Versions
ENV PLATFORMCLI_VERSION 3.9.0
ENV NODE_VERSION 6

# Install all the CLI magic
RUN apt-get update -y && apt-get install -y \
    curl \
    git-core \
  && docker-php-ext-install \
    mysqli \
  && groupadd -r node && useradd -r -g node node \
  && curl -sL "https://deb.nodesource.com/setup_$NODE_VERSION.x" | bash \
  && apt-get install nodejs \
  && npm install --production -g grunt-cli gulp-cli bower \
  && mkdir -p /config \
  && rm -rf ~/.npm \
  && npm cache clear \
  && curl "https://github.com/platformsh/platformsh-cli/releases/download/v$PLATFORMCLI_VERSION/platform.phar" -L -o /usr/local/bin/platform \
  && chmod +x /usr/local/bin/platform \
  && mkdir -p /usr/share/drush/commands && mkdir -p /root/.platformsh \
  && cd /usr/share/drush/commands \
  && curl -L "http://ftp.drupal.org/files/projects/registry_rebuild-7.x-2.3.tar.gz" | tar -zvx \
  && apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf && rm -rf /var/lib/cache/* \
  && rm -rf /var/lib/log/* && rm -rf /tmp/*

ENTRYPOINT ["/bin/bash"]
CMD ["true"]
