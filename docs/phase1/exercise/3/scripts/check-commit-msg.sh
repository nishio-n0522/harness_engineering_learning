#!/bin/sh

commit_message_file="$1"

if ! grep -qE '^(feat|fix|docs|chore|refactor|test): .+' "$commit_message_file"; then
	printf "\033[31mコミットメッセージがConventional Commits形式に従っていません\033[0m"
	exit 1
fi

exit 0