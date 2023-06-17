#!/bin/bash

# ログのローテート
mv ./app/logs/nginx/access.log "./app/logs/nginx/access.log.$(date "+%Y%m%d_%H%M%S")"
mv ./app/logs/nginx/error.log "./app/logs/nginx/error.log.$(date "+%Y%m%d_%H%M%S")"
mv ./app/logs/mysql/slow.log "./app/logs/mysql/slow.log.$(date "+%Y%m%d_%H%M%S")"

#bash run.sh
