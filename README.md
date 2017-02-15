Platform Workflow Demo
======================

This is a GitHub flow/Travis/platform.sh workflow demo adapted from [here](https://github.com/platformsh/platformsh-example-drupal8).

  * **[GitHub](http://github.com) and [ZenHub](http://zenhub.com)** - For `git` storage and Kanban/Agile based project management
  * **[Kalabox](http://kalabox.io)** - For PaaS emulation and local development
  * **[Travis CI](http://travis-ci.org)** - For continuous integration and delivery
  * **[platform.sh](http://platform.sh)** - For container based QA and hosting

Getting Started
---------------

To start developing on you will need [Kalabox](http://kalabox.io) version `2.1.3` or higher.

### Installing Kalabox

Please consult the Kalabox documentation for [installation steps](http://docs.kalabox.io/en/v2.1/users/install/) and [system requirements](http://docs.kalabox.io/en/v2.1/general/sysreq/). The **tl;dr** here is:

  1. Make sure you do not have an existing application like `apache` using ports `80` or `443`. This mean turning off any local webservers you might be running like `MAMP`, `apache`, `vagrant`, `XAMP` etc.
  2. Download and install the latest and OS appropriate [release](https://github.com/kalabox/kalabox/releases).

### Pre-flight checks

Our local Kalabox-based development environment relies on being authenticated with [platform.sh](http://platform.sh). To do that you will want to make sure that:

#### 1. You have access to `git clone` this repository.

  * Add your [`ssh public key`](https://help.github.com/articles/generating-an-ssh-key/) to GitHub
  * Make sure you have been added as a contributing team member to this project or the the appropriate org on GitHub

#### 2. You can authenticate with [platform.sh](http://platform.sh)

  * [Add your public key](https://docs.platform.sh/development/ssh.html) to platform.sh
  * You have authenticated with the [platform cli](https://github.com/platformsh/platformsh-cli)

    **or**

  * You have added an API [`token`](https://github.com/platformsh/platformsh-cli#customization) to your `~/.platformsh/config.yml` file

**NOTES:**
  * For now your `ssh` public key needs to be the one at `~/.ssh/id_rsa.pub`. Once we all have `platform.sh` accounts this can be automated.

### Running Locally

Once you've installed Kalabox and completed the pre-flight steps above you should be able to run locally.

```bash
# Clone down the code
git clone https://github.com/thinktandem/platform-workflow-demo.git
cd platform-workflow-demo

# Authenticate with platform
# NOTE: You can skip this step if you've configured `platform cli` to use an API token
# NOTE: If you are running `kbox platform` for the first time it will take a few minutes to install the needed dependencies
kbox platform || platform

# Spin up the site
# NOTE: If you are starting for the first time it will take a few minutes to install the needed dependencies
kbox start -- -d

# List all commands for this local environment
kbox

# Rebuild your entire local sitution
rm -rf public
kbox start -- -d
```

Using Kalabox
-------------

Here is a brief listing of some of the most important Kalabox commands. For more advanced usage check out [KALABOX.md](KALABOX.md).

### Basic app operations

```bash
# Navigate to your app
cd /path/to/app

# Starting your app
kbox start

# Restarting your app in verbose mode
kbox restart -- -v

# Stopping your app with debug loggin
kbox stop -- -d

# Display information about how to connect to services like your database
kbox services

# Rebuilding your app
# You will want to do this when you have new services to install like solr or
# or existing serivices like php change version
kbox rebuild

# Powering off all Kalabo containers
kbox poweroff
```

### Platform.sh specific commands

```bash
# Navigate to your app
cd /path/to/app

# Redo the platform.sh build process
kbox build

# Import custom environental variables set on platform
kbox pulldb

# Repull the prouduction DB
kbox pulldb

# Repull the prod files
kbox pullfiles
```

### Helpful dev commands

```bash
# Navigate to app
cd /path/to/app

# Run drush commands
cd public

# Clear cache
kbox drush cc all

# Run drush status
kbox drush status

# Get a login link
kbox drush uli

# Run platform.sh cli commands
kbox platform
```

Themeing
--------

We use `npm`, `bower`, `gulp` and `node-sass` to compile our `sass` to `css`. If you ran through the normal spin up detailed in the Kalabox section above you should already have all your dependencies installed and ready to go for theming.

```bash
# Compile our sass files to css
cd path/to/theme
kbox gulp sass || kbox gulp styles
```

Here are some other helpful commands you might need to run at one point or another.

```bash
# Install dependencies - npm install will auto-run bower install
cd path/to/theme
kbox npm install

# Run auto-compilation with livereload
# Note: We might need to update the livereload config to work with kalabox for this to work properly
cd path/to/theme
kbox gulp watch
```

Development Process and Workflow
--------------------------------

This repo uses a modified [GitHub Flow](https://guides.github.com/introduction/flow/) development model. You can read more about this process in the aforementioned link but the general flow is:

  1. Choose a ticket or issue from the [ZenHub board](https://github.com/thinktandem/platform-workflow-demo#boards)
  2. Open a `git branch` in the form `ISSUENUMBER-BRIEFDESCRIPTION` to work on that issue
  3. Add commits to this branch with message form `#ISSUENUMBER: COMMIT DESCRIPTION`
  4. Push the `git branch` when work is complete
  5. [Open a pull request](https://help.github.com/articles/creating-a-pull-request/)
  6. Follow any checklists that are auto-generated by the pull request
  7. Wait for any automated tests (travis-ci), or manual QA (platform envs, code review) to pass
  8. Merge the code into `test`
  9. Delete the topic branch

**NEVER EVER EVER EVER PUSH ANYTHING DIRECTLY TO THE MASTER BRANCH!!!**

### Helpful commands

```bash
# Pull all new branches and code
git fetch --all

# Switch to our default test branch and pull down its latest code and then
# create a new branch to work on an issue
git checkout test
git pull origin test
git checkout -b 12-myFeature

# Commit some work and push it to github so we can open a PR
git add .
git commit -m "#12: My awesome code"
git push origin 12-myFeature

# Check out someone elses branch so you can add work to it
git fetch --all
git checkout 13-bobsFeature
git pull origin 13-bobsFeature
git add .
git commit -m "#13: Adding my awesome code to bobs feature"
git push origin 13-bobsFeature
```

Deploying to Production
-----------------------

When you feel like the `test` environment is ready to be merged into production ie the `master` branch you will want to open up a pull request on GitHub that merges `test` into `master`. Once the tests pass and the branch is merged you will have deployed to production. In this scenario you will not want to delete the `test` branch since will be using it again.

Running Tests & QA Procedures
-----------------------------

### Running tests locally

This will do basic `phplinting` and will also print out compliance with Drupal Code Standards.

```bash
composer install
composer test
```

### Tests on Travis CI and QA on Platform.sh

Every pull request, branch or merge will kick off a [Travis CI](https://travis-ci.org) build that will test:

1. PHP linting / Drupal code standards compliance
2. Whether the platform.sh build process completes succesfully
3. Whether we have a minimally viable Drupal website running

Additionally, an environment will be spun up on Platform.sh for manual QA via its [GitHub Integration](https://docs.platform.sh/administration/integrations/github.html). If you get a WSOD on the spun up Pantheon site you will want to run `drush rr` on the new environments

```bash
kbox.dev platform ssh --project=wu3zz2qpkwfts --environment=ID
cd public
drush rr
```

It is highly recommended that all of the above tests and QA procedures check out before code is merged.

Other Resources
---------------

* [Kalabox documentation](http://docs.kalabox.io/en/v2.1/)
* [ZenHub documentation](https://www.zenhub.com/blog/getting-started-with-zenhub/)
* [GitHub Flow documentation](https://guides.github.com/introduction/flow/)
* [Platform.sh documentation](https://docs.platform.sh)
* [Travis CI documentation](https://docs.travis-ci.com/)
* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
