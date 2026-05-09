# Decision Log

ツール選定やルール採用の判断を時系列で記録する。「決定 → 理由 → 代替案 → 再評価タイミング」の構造にすると、後で「なぜこうなったか」を辿れる。

## 記入テンプレート

```markdown
### YYYY-MM-DD: <決定の見出し>

- **決定**: 何を採用 / 棄却したか
- **理由**: なぜその決定に至ったか（参照: results/bench-XXXX.md, findings.md など）
- **代替案**: 検討した別案と却下理由
- **再評価のタイミング**: いつ見直すか（例: tsgolint stable リリース時）
```

---

## ログ

### 2026-05-06: oxfmt の config 配置をルート直下に変更

- **決定**: `.oxfmtrc.json` をリポジトリルートに置く。`configs/oxfmt.config.json` は削除。
- **理由**: oxfmt（Beta）は cwd から `.oxfmtrc.json` を自動探索する仕様で、`--config` オプションを取らない。`configs/` 配下に置いても認識されず、`oxfmt --check` 実行時に "No config found, using defaults" の警告が出ることを Phase 1 動作確認で観測した。
- **代替案**:
  - `configs/oxfmt.config.json` をルートに symlink → 環境（特に Windows / DevContainer）依存で挙動が不安定
  - 設定ファイルなしで運用 → 学習用途として「設定が反映される」確認ができないので不採用
- **再評価のタイミング**: oxfmt が `--config` オプションを実装した時点（Beta 卒業前後）で再度 configs/ 集約に戻すか検討
