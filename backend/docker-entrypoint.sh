#!/bin/sh
set -e

node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run

exec node dist/main
