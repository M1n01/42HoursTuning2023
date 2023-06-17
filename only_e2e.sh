#!/bin/bash

# ログのローテート
mv ./app/logs/nginx/access.log "./app/logs/nginx/access.log.$(date "+%Y%m%d_%H%M%S")"
mv ./app/logs/nginx/error.log "./app/logs/nginx/error.log.$(date "+%Y%m%d_%H%M%S")"
mv ./app/logs/mysql/slow.log "./app/logs/mysql/slow.log.$(date "+%Y%m%d_%H%M%S")"

# コンテナ再起動
(cd app && bash restart_container.sh)

# 負荷試験 & 採点開始
fileName=$(date "+%Y%m%d_%H%M%S")
(cd benchmarker && ./e2e.sh "$fileName")
