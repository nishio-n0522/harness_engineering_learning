# oxc ツールチェーン全体像

> **参照時点：2026年5月時点の情報**

VoidZero（Vite作者 Evan You が立ち上げた会社）が開発する Rust 製の JavaScript / TypeScript ツールチェーンが **oxc**（The Oxidation Compiler）です。Phase 2 を始めるにあたって、まず「oxc とは何で、何ではないか」を整理しておきます。

直近の動向としては、**oxlint が v1.0 stable に到達**（2025年8月）、**type-aware linting が alpha 段階**（tsgolint 経由で 59/61 typescript-eslint ルール対応）、**oxfmt が 2026年2月に Beta 入り**、**oxc-parser が Vite 8 に内蔵** — という状況です。

## 一言で言うと

っっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっっ

> **同じ AST（抽象構文木）を共有する、複数の Rust 製 JS/TS ツール群**

「単一の万能ツール」ではなく、「役割の違う独立パッケージが集まった生態系」だという点が、設計思想を理解する上で最重要です。

## 構成パッケージ

代表的なものを挙げます。すべて `oxc-` プレフィックスのクレート、または `ox*` という独立コマンドとして公開されています。

| パッケージ            | 役割                                                     |
| --------------------- | -------------------------------------------------------- |
| `oxc-parser`          | JS/TS のパーサ。他の全ツールが内部で利用する基盤         |
| `oxc-ast`             | パーサが出力する AST の型定義                            |
| `oxc-codegen`         | AST → ソースコードの再生成                               |
| `oxc-resolver`        | `import` 文の解決（Node.js / TypeScript / Webpack 互換） |
| `oxc-transformer`     | TypeScript ストリッピング、JSX、ターゲット変換           |
| `oxc-minifier`        | コード圧縮                                               |
| `oxlint`              | リンター（Phase 2 のメイン）                             |
| `oxfmt`               | フォーマッタ（現時点では Beta）                          |
| `oxc-language-server` | LSP 実装                                                 |

## 設計思想：単一 AST を共有することの意味

普通の JS ツールチェーンでは、同じソースコードを **何度もパースし直す** 状況が起きがちです。

```
ESLint        → 自前で AST を作る
Prettier      → 自前で AST を作る
Babel         → 自前で AST を作る
TypeScript    → 自前で AST を作る
```

これは CPU 時間と IO の浪費です。oxc は **「一度パースしたら、その AST を全ツールで使い回す」** という前提で設計されています。

```
oxc-parser → AST
              ├─ oxlint
              ├─ oxfmt
              ├─ oxc-transformer
              └─ oxc-minifier
```

この発想は、結果として以下を引き寄せています。

- 各ツールが Rust で書かれていることによる **絶対的な速度**
- AST の二重生成がないので、複数ツールを連鎖させても **掛け算で遅くならない**
- パーサがバグれば全ツールに影響するので、**互換性が一極集中** する（後述する「弱み」）

## Biome との比較：オールインワン vs モジュラー

oxc を語るときによく対比されるのが [Biome](https://biomejs.dev/) です。両者とも Rust 製で「ESLint + Prettier の代替」という似た立ち位置に見えますが、設計の方向性は対極です。

| 観点               | oxc                                               | Biome v2（Biotype）                        |
| ------------------ | ------------------------------------------------- | ------------------------------------------ |
| パッケージ構成     | 個別ツールの集合（モジュラー）                    | 単一バイナリにすべて同梱（オールインワン） |
| 思想               | 「Unix 哲学的」、必要なものだけ採用               | 「Rome の後継」、すべてを置き換える        |
| Linter の安定性    | oxlint v1.0 stable（2025年8月）                   | v2 stable                                  |
| Formatter の安定性 | **oxfmt は Beta**（2026年2月入り）                | **production-ready（2023年〜）**           |
| ESLint 互換ルール  | 700+ ルール、互換性を重視                         | 約200ルール、独自ルール体系                |
| Type-aware lint    | **alpha**（tsgolint 経由、59/61 ルール、TS 7.0+） | **stable**（独自型推論、TS互換 75〜85%）   |
| Prettier 互換      | oxfmt が互換性を目標（Beta）                      | Prettier 互換だが完全ではない              |
| プラグイン         | JS Plugins Alpha（2026 Q1）                       | Linter Plugins（v2 で導入済み）            |
| 速度（lint）       | ESLint比 50〜100倍、Biome比 約2倍                 | ESLint比 10〜20倍                          |
| エコシステム統合   | **oxc-parser が Vite 8 に内蔵**、Rolldownと密結合 | 独立路線                                   |
| 採用判断           | 既存ツールチェーンの一部を置き換えたい時に向く    | プロジェクトを丸ごと刷新したい時に向く     |

「どっちが正解か」ではなく、**チームの状況とリスク許容度で選ぶ** 領域です。oxc は「いま動いている ESLint を尊重し、徐々に高速な実装に置き換えていく」運用に親和性が高く、Biome は「もう Prettier も ESLint もやめて、新しいツールに乗り換える」決断ができる組織向きです。

### 2026年に Biome が獲得した「決定的な機能」

Biome v2（Biotype）で **type-aware linting が TypeScript コンパイラなしで動くようになった** のは、選定判断に直接影響する重要な変化です。これまで「型情報ルールが必要なら ESLint 必須」だった常識が崩れ、**Biome 単独で `noFloatingPromises` 相当が動く**（TS 互換の約 75〜85%、v2.1 で改善）状態になっています。

oxlint も `tsgolint` バックエンド経由で type-aware に対応しましたが、こちらは alpha 段階で、TypeScript 7.0+ が必須・メモリ消費が大きい・別プロセス（Go バイナリ）が必要、といった制約があります。詳細は [type-aware-limitation.md](./type-aware-limitation.md) を参照。

## 新規プロジェクトでの選定：oxc か Biome か

「新規プロジェクトで何も縛りがない」状況だけを取り出すと、**2026年5月時点では Biome の方がデフォルトの選択肢として無難** です。理由は単純で、formatter が stable・type-aware が stable・ゼロコンフィグで動く、の3点が揃っているからです。oxc 側はそれぞれが alpha/Beta なので、本番投入には判断とフォローが要ります。

ただし以下のいずれかに当てはまるなら、新規でも oxc を選ぶ合理性があります。

- **Vite / Rolldown を使う**：oxc-parser が Vite 8 に内蔵されており、ツールチェーンの一貫性が出る
- **絶対速度が支配的**：モノレポで lint 時間が CI のクリティカルパスになっている
- **ESLint 互換ルールに依存している**：700+ の互換ルールを活かしたい
- **学習目的**：oxc を理解することそのものが目標（**この学習プランはここに該当**）
- **モジュラー設計を好む**：「Linter は oxlint、Formatter は Prettier 維持」のような部分採用をしたい

逆に、**Biome を選ぶべき典型ケース** は次のとおりです。

- 新規プロジェクトで、ツール選定に時間をかけたくない
- type-aware lint を最初から本番運用したい（TSコンパイラ不要）
- HTML / Vue / Svelte / Astro などクロスランゲージ対応を重視
- 単一バイナリでの運用シンプルさを優先

「速さ」は判断軸の一つに過ぎません。**「formatter が stable」「type-aware が stable」というステージの差** のほうが、運用上の体感には強く効きます。

## なぜ速いのか

「Rust だから速い」だけでは説明として不十分です。oxc が ESLint 比 50〜100 倍速い理由は、複数の要因の合算です。

1. **言語の差**：JS の VM 起動、JIT ウォームアップが不要
2. **AST の使い回し**：複数ツールでパース重複が起きない
3. **並列実行の前提設計**：ファイル単位の lint がデフォルトで並列
4. **設定読み込みコストの低さ**：ESLint の `eslint.config.js` 動的評価がない

ベンチマークの数字（"50〜100 倍"）は環境依存で、特に **小規模プロジェクトでは差が出にくい** 点に注意してください。oxc が真価を発揮するのは、ファイル数が数千〜のリポジトリです。

## oxc を採用する判断軸

Phase 2 で実際に手を動かす前に、採用判断のフレームを持っておくと迷子になりません。

### 向いているケース

- **ESLint の遅さが開発体験を阻害している**：保存時 lint が秒単位で待たされる規模
- **モノレポでファイル数が多い**：lint 時間がそのまま CI 時間に効く
- **チームが「徐々に」移行したい**：いきなり Biome は重い
- **既存の ESLint ルールを尊重したい**：互換性を捨てたくない

### 向いていないケース

- **type-aware ルールに強く依存している**：alpha 段階の tsgolint で 59/61 ルールに対応したものの、本番投入には早い。Biome v2 か ESLint 併用が現実的（[type-aware-limitation.md](./type-aware-limitation.md) で詳述）
- **Stylistic ルールに細かい要望がある**：oxlint は stylistic を deprecated 扱いにする方針
- **数百行規模の小プロジェクト**：ESLint のままで困っていないなら投資対効果は薄い
- **新規プロジェクトでツール選定に時間をかけたくない**：素直に Biome を採用するほうが早い

## 学習を進めるにあたっての視点

Phase 2 を通じて持っておくと有益な視点を3つ挙げます。

1. **「ESLint の置き換え」と捉えない**：oxc は ESLint と共存する前提のツールです。完全置換を目指すと挫折します
2. **「速さ」を盲信しない**：速さは手段であって目的ではない。チームの開発体験が改善することを目標にする
3. **Beta 段階のツールを混ぜる際のリスク**：oxfmt はまだ Beta。本番採用するならフォールバック戦略を用意する

## 次に読むもの

このドキュメントを読み終えたら、以下の順で深掘りします。

1. [oxlint-fundamentals.md](./oxlint-fundamentals.md) — リンターとして oxlint をどう設定するか
2. [eslint-to-oxlint-migration.md](./eslint-to-oxlint-migration.md) — 既存 ESLint プロジェクトに段階導入する戦略
3. [oxfmt-introduction.md](./oxfmt-introduction.md) — フォーマッタとしての oxfmt の現在地
4. [type-aware-limitation.md](./type-aware-limitation.md) — oxlint が今できないこと

その後、`exercise/phase2-handson-exercises.md` のハンズオン課題に進んでください。

## 参考リンク

- [oxc 公式サイト](https://oxc.rs/)
- [oxc GitHub リポジトリ](https://github.com/oxc-project/oxc)
- [Announcing Oxlint 1.0 | VoidZero](https://voidzero.dev/posts/announcing-oxlint-1-stable)
- [Announcing Oxlint Type-Aware Linting Alpha | VoidZero](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting-alpha)
- [tsgolint（type-aware バックエンド）](https://github.com/oxc-project/tsgolint)
- [VoidZero による発表（"Announcing VoidZero"）](https://voidzero.dev/posts/announcing-voidzero-inc)
- [Biome 公式サイト](https://biomejs.dev/)（比較対象として）
- [Biome v2—codename: Biotype](https://biomejs.dev/blog/biome-v2/)
- [Biome Roadmap 2026](https://biomejs.dev/blog/roadmap-2026/)
