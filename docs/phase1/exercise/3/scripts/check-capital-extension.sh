#!/bin/sh

check_has_capital_extension(){
	if echo "$1" | grep -qE '\.[A-Z]+$'; then
		return 0
	fi
	return 1
}


printf 'check capital extension hook started\n'

has_error=0
for file in "$@"; do
	if check_has_capital_extension "$file"; then
		printf "\033[31merror: 拡張子に大文字が含まれています: %s\033[0m\n" "$file"
		has_error=1
	fi
done

if [ "$has_error" -eq 1 ]; then
	exit 1
fi

exit 0