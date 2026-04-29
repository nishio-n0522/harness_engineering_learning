#!/bin/sh

# 引数のファイルの1行目にshebangがあるかどうかをチェックする関数
check_has_shebang() {
	first_line=$(head -n 1 "$1")
	if [ "$first_line" = '#!/bin/sh' ] || [ "$first_line" = '#!/bin/bash' ]; then
		return 0
	fi
	return 1
}

printf 'pre-commit hook started\n'

has_error=0
for shell_file in "$@"; do
	if ! check_has_shebang "$shell_file"; then
		printf "\033[31merror: shebangがありません: %s\033[0m\n" "$shell_file"
		has_error=1
	fi
done

if [ "$has_error" -eq 1 ]; then
	exit 1
fi

exit 0