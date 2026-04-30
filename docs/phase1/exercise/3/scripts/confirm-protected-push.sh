#!/bin/sh

current_branch=$(git rev-parse --abbrev-ref HEAD)
case "$current_branch" in
	main|master)
		printf "プッシュしようとしているリモートブランチが main もしくは master です。このままpushを継続しますか？問題なければ y を入力してください。\n"
		read -r line
		[ "$line" = "y" ] || exit 1
		;;
esac

exit 0