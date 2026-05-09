# ESLint から oxlint への段階移行戦略

> **参照時点：2026年5月時点の情報**

oxlint を学んでまず誘惑されるのが「ESLint を全部 oxlint に置き換えよう」という発想です。**ほぼ確実に失敗します**。oxlint は ESLint のスーパーセットではなく、特に type-aware ルール（型情報を使うルール）への対応が **alpha 段階**（tsgolint 経由で 59/61 ルール対応）であり、本番投入には判断とフォローが要るからです。

このドキュメントでは、**ESLint と oxlint を共存させながら、徐々に oxlint 比率を上げていく** 現実的な戦略を整理します。

## 大原則：いきなり全置換しない

新規プロジェクトなら oxlint 単独でも問題ありません。しかし既存プロジェクトには、しばしば以下のものが眠っています。

- `@typescript-eslint/no-floating-promises` などの型情報必須ルール
- 自社製 ESLint プラグイン
- カスタムルール（`eslint-plugin-local`）
- `eslint-plugin-import` の細かい設定
- `eslint-config-airbnb` のような巨大な extends 群

これらを一気に oxlint に移すのは現実的ではないので、**ハイブリッド運用** から始めるのが王道です。

## 移行の4ステップ

### Step 1：oxlint を「並走」させる

最初は ESLint をそのまま動かしながら、oxlint を **追加で** 走らせるだけにします。

```bash
npm i -D oxlint
```

`package.json` に並走スクリプトを足します。

```json
"scripts": {
  "lint": "eslint .",
  "lint:oxc": "oxlint",
  "lint:all": "npm run lint:oxc && npm run lint"
}
```

この時点では設定の重複は気にせず、**両方走らせて結果を比較する** のが目的です。oxlint がカバーしているルールでは ESLint と同じ警告が二重に出ることがありますが、後の Step で解消します。

### Step 2：`@oxlint/migrate` で設定を変換

既存の `.eslintrc.*` や `eslint.config.js` から、対応する `.oxlintrc.json` を機械的に生成できます。

```bash
npx @oxlint/migrate
```

このコマンドが行うことは限定的です。

- ESLint 設定からカテゴリ・プラグイン・ルールを抽出
- 対応するルールがある場合は `.oxlintrc.json` に書き起こす
- **対応のないルールはスキップ**（=どこかに記録は残るが移行されない）

生成された `.oxlintrc.json` は **完成品ではなく草案** です。プロジェクト固有のルールは手動で見直します。生成結果を git に commit する前に、`oxlint` を実行して期待通りの警告が出るかを必ず確認してください。

### Step 3：`eslint-plugin-oxlint` で ESLint 側の重複を消す

ハイブリッド運用最大の敵は **ルールの二重実行による警告の重複** です。これを解消するのが [`eslint-plugin-oxlint`](https://github.com/oxc-project/eslint-plugin-oxlint) です。

```bash
npm i -D eslint-plugin-oxlint
```

`eslint.config.js` の末尾で、oxlint がカバーしているルールを ESLint 側で **off に上書き** します。

```js
import oxlint from 'eslint-plugin-oxlint';

export default [
  // ... 既存の ESLint 設定
  ...oxlint.configs['flat/recommended'], // ← 末尾で off にする
];
```

ポイントは **必ず配列の末尾に置く** ことです。前に置くと、その後の設定で再有効化されてしまいます。

これで運用イメージは以下になります。

```
oxlint    → 高速にカバー可能なルールを実行
ESLint    → oxlint 未対応のルール（特に type-aware）だけを実行
```

ESLint の実行時間は、対象ルールが減った分だけ短くなります。oxlint と合わせても、純粋な ESLint 単独より速くなることが多いです。

### Step 4：CI / lefthook を切り替える

CI と lefthook で oxlint と ESLint を別ジョブに分けます。

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  jobs:
    - name: oxlint
      run: npx oxlint {staged_files}
      glob: "*.{js,jsx,ts,tsx}"
    - name: eslint
      run: npx eslint {staged_files}
      glob: "*.{js,jsx,ts,tsx}"
```

CI でも同様に並列ジョブにします。oxlint は数秒で終わるので、**フィードバックの早い順に並べる** と「ほぼ即座に lint エラーが返ってくる」体験になります。

## 移行を成功させるための運用ルール

### ルール1：移行は「追加」と「無効化」で進める

`.oxlintrc.json` に新しいルールを **追加** したら、対応する ESLint ルールを **無効化** する。これをセットで行います。中途半端にどちらかだけ進めると、二重警告で開発者を苛立たせます。

### ルール2：型情報必須のルールは「ESLint 残置」or「tsgolint alpha」の二択で考える

以下のようなルールは、構文 AST だけでは判定できないので扱いを決める必要があります。

- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/no-misused-promises`
- `@typescript-eslint/await-thenable`
- `@typescript-eslint/no-unnecessary-type-assertion`
- `@typescript-eslint/strict-boolean-expressions`

2026年5月時点での選択肢は2つあります。

1. **ESLint に残す（保守的）**：`@typescript-eslint` のうち type-aware ルールだけを ESLint 側で動かす。実績ある stable な構成
2. **tsgolint を使って oxlint で動かす（先進的）**：`oxlint --type-aware` を有効化。alpha 段階だが 59/61 ルール対応済み・速度面の恩恵あり。TypeScript 7.0+ が必要で、メモリ消費が大きい

「速度が支配的」「将来的にも oxlint に寄せたい」なら 2 を試す価値があります。「本番運用の安定性が最優先」なら 1 のまま続けます。いずれにせよ `tsc --noEmit` を CI に含めて型チェックを別途行うのが現実解です。詳細は [type-aware-limitation.md](./type-aware-limitation.md) を参照してください。

### ルール3：エディタ統合は「両方有効」にしておく

ESLint と oxlint の VSCode 拡張は競合せず共存できます。移行期間中は **両方とも有効** にしておくのが安全です。`eslint-plugin-oxlint` を入れていれば、二重警告は出ません。

### ルール4：CI では `--deny-warnings` を使う

`oxlint --deny-warnings` を CI に入れることで、warn ルールを実質的に強制します。これがないと「警告が積もるが誰も読まない」現象が起きやすく、移行の進捗が見えなくなります。

## ハイブリッド運用の終わらせ方

「いつ ESLint を完全に外せるか」の判断軸は4つです。

1. **残る ESLint ルールが、本当に oxlint に未実装か**を確認する
   - oxlint は活発に開発されているので、半年前に未対応だったルールが対応済みかもしれない
2. **tsgolint（type-aware alpha）が stable に到達したか**を確認する
   - alpha 段階では本番投入を見送るのが安全。stable に到達すれば、type-aware ルールも oxlint 側で完結する見通し
3. **残るルールを `tsc` や別ツールで代替できないか**を検討する
   - 例：`no-floating-promises` は警告 → エラーで運用するより、`async/await` を厳密に書くスタイルガイドの徹底のほうが効果的なケースもある
4. **そのルール、そもそも必要か** を再評価する
   - 移行のタイミングは、不要ルールを整理する好機

ESLint を残す決断は別に敗北ではありません。**「型情報が必要なルールだけ ESLint」** という形で長期運用するチームは普通にあります。

なお「ESLint を捨てて Biome v2 に丸ごと乗り換える」という第三の選択肢もあります。Biome v2 は TypeScript コンパイラなしで type-aware lint が動くので、移行ゴールとして意外と現実的です。oxlint と比べたい場合は [oxc-toolchain-overview.md](./oxc-toolchain-overview.md#biome-との比較オールインワン-vs-モジュラー) の比較表を参照してください。

## やってはいけないこと

- **設定ファイルを片方だけ更新する**：`.oxlintrc.json` を変えたら ESLint 側の対応も同時に確認する
- **`eslint-plugin-oxlint` を配列の途中に置く**：末尾でないと無効化が効かない
- **type-aware ルールを oxlint に期待する**：oxc の Roadmap に乗っているが現状は限定的
- **「速くなったから ESLint を消す」と即決する**：開発体験は速度だけで決まらない。残すべきルールの存在を確認

## 参考：移行進捗の可視化

進捗管理に困ったら、以下のような表をリポジトリの NOTES に作っておくと議論が楽になります。

| ルール                                    | ESLint | oxlint | 状況                              |
| ----------------------------------------- | ------ | ------ | --------------------------------- |
| `no-unused-vars`                          | off    | error  | oxlint に移行済み                 |
| `react/jsx-key`                           | off    | error  | oxlint に移行済み                 |
| `@typescript-eslint/no-floating-promises` | error  | -      | type-aware なので ESLint で残す   |
| `import/order`                            | error  | warn   | 移行検証中                        |

## 参考リンク

- [oxlint Migration Guide](https://oxc.rs/docs/guide/usage/linter/migrate.html)
- [eslint-plugin-oxlint](https://github.com/oxc-project/eslint-plugin-oxlint)
- [@oxlint/migrate](https://www.npmjs.com/package/@oxlint/migrate)
