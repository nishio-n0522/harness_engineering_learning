# Phase 1 ハンズオン課題：Gitフック / lefthook

ハーネスエンジニアリング学習プランの **Phase 1（lefthook / Gitフック基盤）** に対応するハンズオン課題集です。素のシェルスクリプトで手書きするところから始め、段階的に lefthook への移行を体験することで、**lefthook が何を抽象化しているか**を自分の痛みの経験から理解することを目標にしています。

## 全体の流れ

| 問題  | 難易度 | 所要時間    | 学びのフォーカス                    |
| ----- | ------ | ----------- | ----------------------------------- |
| 問題1 | ★☆☆    | 30分〜1時間 | Gitフックの基本、shellの制御感覚    |
| 問題2 | ★★☆    | 2〜3時間    | 複数フックの連携、痛みの蓄積        |
| 問題3 | ★★★    | 2〜3時間    | lefthook への移行、抽象化の価値理解 |

週末1日で全部回せるボリュームです。詰まったらその都度シェルや Git の仕様を調べながら進めるのが、一番学びになります。

---

## 問題1：素のGitフックで「コミットを止める」体験

**難易度：★☆☆**

### ゴール

`.git/hooks/pre-commit` を手書きして、**特定の条件を満たしたらコミットを止める**フックを作る。

### 要件

1. 新しい空のGitリポジトリを作成する（`git init`）
2. `.git/hooks/pre-commit` を作成し、以下の動作をさせる：
   - コミット時に `pre-commit hook started` と表示する
   - ステージされたファイルの中に、`.log` という拡張子のファイルがあったらコミットを中止する
   - `.log` ファイルがなければ正常にコミットを通す
3. 実際に以下の2パターンでテストする：
   - `sample.log` をステージしてコミット → ブロックされることを確認
   - `sample.txt` をステージしてコミット → 通ることを確認

### ヒント

- 実行権限を忘れずに（`chmod +x`）
- ステージされたファイル一覧は `git diff --cached --name-only --diff-filter=ACM` で取れる
- `.log` ファイルがあるかどうかは `grep` で判定できる
- コミットを止めるには `exit 1`
- grep は「マッチなし」で終了コード1を返すので、判定ロジックを工夫する

### 学べること

- Gitフックの発火タイミング
- `chmod +x` を忘れる罠
- 終了コードで制御する感覚
- `git diff --cached` の実践的な使い方

### 発展課題

- エラーメッセージを赤文字で表示してみる（`\033[31m...\033[0m`）
- ブロック時に「どのファイルが原因か」を表示する
- `git commit --no-verify` でフックをスキップできることを確認する

---

## 問題2：3つの別フックを連携させる

**難易度：★★☆**

### ゴール

`pre-commit` / `commit-msg` / `pre-push` の3つのフックを書いて、**Gitの各タイミングで別々の処理**を行う。

### 要件

#### `pre-commit`：コミット前の品質チェック

- ステージされたファイルの中で `.sh` ファイルを検出する
- 各 `.sh` ファイルに対して、1行目が `#!/bin/sh` または `#!/bin/bash` で始まっているかをチェックする
- shebangがない `.sh` ファイルがあればエラーで止める

#### `commit-msg`：コミットメッセージの形式チェック

- コミットメッセージが **Conventional Commits 形式**に沿っているかチェック
  - 例：`feat: xxx`、`fix: xxx`、`docs: xxx`、`chore: xxx`、`refactor: xxx`、`test: xxx`
- 違反していたらエラーで止める
- ヒント：`commit-msg` フックには第1引数（`$1`）としてメッセージファイルのパスが渡される

#### `pre-push`：pushする前の最終チェック

- push先のブランチが `main` または `master` だったら確認プロンプトを出す
- ユーザーが `y` と答えたらpush続行、それ以外なら中止
- ヒント：`pre-push` はstdinから `<local ref> <local sha> <remote ref> <remote sha>` を受け取る

### テストシナリオ

1. shebangのない `bad.sh` をステージしてコミット → `pre-commit` でブロックされる
2. shebangのある `good.sh` をコミット、メッセージ `update stuff` → `commit-msg` でブロックされる
3. メッセージ `feat: add good script` でコミット → 通る
4. `main` ブランチに push → 確認プロンプトが出る

### 学べること

- フックごとの引数・stdin の違い
- 複数フックの連携設計
- 正規表現パターンの使い方
- フック間で共通処理を使いたくなる欲求（= lefthook が解決する課題）

### 発展課題

- ファイル名チェック（例：`uppercase.TXT` のような大文字拡張子を禁止）を `pre-commit` に追加する
- 最大ファイルサイズチェック（1MB超を禁止）を追加する
- これらを追加するうちに「`pre-commit` ファイルが長くなって読みにくい」ことに気づく

---

## 問題3：素のフックから lefthook へ移行する

**難易度：★★★**

### ゴール

問題2で作った3つのフックを、**lefthookの `lefthook.yml`** に置き換える。その過程で「lefthookが何を抽象化しているか」を体で理解する。

### 要件

#### Step 1：lefthook の導入

1. `npm init -y` で package.json を作成
2. `npm i -D lefthook` でインストール
3. `npx lefthook install` でフックをセットアップ

#### Step 2：既存のシェルスクリプトを別ファイルに切り出す

1. `scripts/check-shebang.sh` → shebangチェック
2. `scripts/check-commit-msg.sh` → コミットメッセージチェック
3. `scripts/confirm-protected-push.sh` → 保護ブランチへのpush確認

スクリプトは**2や引数でファイル名リストを受け取る**形にリファクタリングする。

#### Step 3：`lefthook.yml` を書く

以下の要件を満たす設定を作る：

- `pre-commit`：
  - `.sh` ファイルがステージされている時だけ `check-shebang.sh` を走らせる（`glob` を使う）
  - ステージされたファイルを引数として渡す（`{staged_files}` を使う）
  - **並列実行**を有効にする（`parallel: true`）
- `commit-msg`：
  - `scripts/check-commit-msg.sh` を走らせる
  - メッセージファイルのパスを `{1}` で渡す
- `pre-push`：
  - `scripts/confirm-protected-push.sh` を走らせる
  - インタラクティブな確認が必要なので、並列実行は無効にする（`interactive: true` を使う）

#### Step 4：素のフックと lefthook を比較する

`.git/hooks/` 配下を見て、lefthook が**自動でフックスクリプトを配置している**ことを確認する。以下を観察してメモする：

1. `.git/hooks/pre-commit` は今どうなっているか？
2. 自分が書いた素のフックと、lefthookが生成したフックの違いは？
3. `lefthook.yml` を編集したとき、`.git/hooks/` のファイルは自動で更新されるか？

> **VS Codeで `.git` フォルダが見えない場合：**
> 設定 → `files.exclude` で `**/.git` を削除（または `false` に設定）すると見えるようになります。学習中は表示しておくのがおすすめです。

### 検証シナリオ

1. `.sh` ファイルを含まないコミット → shebangチェックが実行されない（`glob` で絞られている）ことを確認
2. 複数の `.sh` ファイルをステージしてコミット → 並列実行されている雰囲気を確認
3. Conventional Commits 違反メッセージ → ブロックされる
4. `main` ブランチへの push → 確認プロンプトが出る

### 学べること

- lefthook がラップしているのは結局シェル実行であること
- `glob`、`{staged_files}`、`parallel` など lefthook の各機能の**必要性**
- 素のシェルで書いていた処理が、YAML設定で**宣言的に書ける**ありがたみ
- lefthook が `.git/hooks/` を自動管理してくれる利便性
- チームに配布する際、lefthook なら `lefthook.yml` をコミットするだけで済むが、素のフックは `.git/hooks/` がGit管理外なので配布が困難であること

### 発展課題

- `lefthook-local.yml` を作って、自分だけの一時的な設定を上書きしてみる
- `skip` オプションを使って、特定の条件でフックをスキップする方法を試す
- `lefthook run pre-commit` でフックを手動実行できることを確認する
- `lefthook run pre-commit --files src/*.sh` で任意のファイルを対象に実行してみる
- CIに組み込む場合、どのタイミングで `lefthook run` を呼ぶべきかを考察する

---

## 進め方の提案

この3問を順番に解くと、以下のような学習体験になります。

**問題1で得られる感覚：**

> 「Gitフックって、ただのシェルスクリプトなんだ。仕組みはシンプル」

**問題2で得られる感覚：**

> 「複数フックの管理、だんだん面倒だな。共通処理をどこに置く？チームで共有するには？」

**問題3で得られる感覚：**

> 「lefthookってこの面倒を全部解決してくれるんだ。YAML で宣言的に書けるのが楽」

この**「素で書いて痛みを感じる → ツールの価値が分かる」**という体験が、Phase 0 の「生のシェルスクリプトで手書きして、lefthook が何を抽象化しているかを体で理解する」という目標そのものです。

## 詰まったときのヒント

- **フックが発火しない** → 実行権限（`chmod +x`）とファイル名（`.sample` が付いていないか）を確認
- **ステージされたファイルの取り方がわからない** → `git diff --cached --name-only --diff-filter=ACM`
- **正規表現でハマる** → シングルクォートで囲む、`$` は行末、`\.` で文字通りのドット
- **grep がマッチなしで止まる** → `|| true` で握り潰す、または `grep -c` でカウントを使う
- **lefthook の設定が反映されない** → `npx lefthook install` を再実行

## 参考資料

- [Pro Git Book - Customizing Git - Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Atlassian - Git Hooks Tutorial](https://www.atlassian.com/git/tutorials/git-hooks)
- [lefthook 公式リポジトリ](https://github.com/evilmartians/lefthook)
- [Conventional Commits 仕様](https://www.conventionalcommits.org/)
- [ShellCheck（シェルスクリプトの静的解析）](https://www.shellcheck.net/)
