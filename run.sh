#!/bin/bash

# ==================================
# リストア・マイグレーション・e2eテスト・負荷試験・採点の順で実施してくれるスクリプト。
# ==================================

(cd benchmarker && bash restore_and_migration.sh)
if [ $? -ne 0 ]; then
    echo "採点フローを中断します。"
    exit 1
fi

# e2eテスト
if [[ $HOSTNAME == env-* ]]; then
    (cd benchmarker && ./e2e.sh)
    if [ $? -ne 0 ]; then
        echo "採点フローを中断します。"
        exit 1
    fi
fi

fileName=`date "+%Y%m%d_%H%M%S"`

# 負荷試験 & 採点開始
(cd benchmarker && ./run_k6_and_score.sh $fileName)
if [ $? -ne 0 ]; then
    echo "採点フローを中断します。"
    exit 1
fi

if [[ $HOSTNAME != env-* ]]; then
    exit 0
fi

echo "サーバーへスコアを送信します。"
requestBody=`cat ./benchmarker/score/${fileName}.json | awk '{print substr($0, 2, length($0)-2)}'`
key=`cat ./.da/funcKey`
repo=`cat /.da/cloneUrl`
version="v2"
statusCode=`curl -o /dev/null -w '%{http_code}\n' -s -X POST -d '{"hostname": "'$HOSTNAME'", "repo": "'$repo'","version": "'$version'", '$requestBody'}' "https://ftt2306.azurewebsites.net/api/HttpTrigger1?code=${key}"`

if [ $statusCode = "200" ]; then
    echo "スコアの送信に成功しました。"
else
    echo "スコアの送信に失敗しました。メンターに報告してください。"
    exit 1
fi
