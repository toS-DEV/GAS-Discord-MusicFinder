# GAS-Discord-MusicFinder
楽曲をおすすめしてくるわもさん

GASを使用してプロセカの楽曲を難易度やMVで絞り込み、DiscordにWebhookするやつです。

## 用意するもの
- Google spreadsheet : ここに楽曲のテーブルやフォーム、GASを追加していきます。
 - Songsテーブルに楽曲のデータを入れます。更新作業がめんどいのでIMPORTHTML関数を使ってます。
 - Google form :「ツール」からフォームを作ってください。 FormResponsesテーブルに追加されるようにしています。

「拡張機能」からGASを編集していきます。
スクリプトを追加したら`main.gs.js`をコピペします

POST_URLにWebhookのURLを編集

最後にトリガーをフォーム提出時にselectRandomSongsが動くように設定したらDiscordに投稿されるようになります。
