#!/bin/sh

has_main_or_master_branch(){
	if echo "$1" | grep -qE '.+/(main|master)$'; then
		return 0
	fi
	return 1
}

has_error=0
while read local_ref local_sha remote_ref remote_sha; do
	if has_main_or_master_branch "$remote_ref"; then
		has_error=1
	fi
done

if [ "$has_error" -eq 1 ]; then
	printf "プッシュしようとしているリモートブランチが main もしくは master です。このままpushを継続しますか？問題なければ y を入力してください。"
	read -r line < /dev/tty
	if [ "$line" = "y" ]; then
		exit 0
	else
		printf "\033[31minfo: プッシュをキャンセルしました\n\033[0m" 
		exit 1
	fi
fi

exit 0