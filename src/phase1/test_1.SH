#! /bin/sh
set -euo pipefail
IFS=$'¥n¥t'

files=$(git diff --cached --name-only --diff-filter=ACM)
if echo "$files" | grep -q '¥.js$'; then
    echo 'ここの出力は？'
    js_files=$(echo "$files" | grep '¥.js$')
    echo "$js_files"
else
    echo '実行エラー発生"
fi