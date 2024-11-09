const POST_URL="(https://discord.com/api/webhook...)"
function selectRandomSongs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const songsSheet = ss.getSheetByName("Songs");
  const tempSheet = ss.getSheetByName("Temporary");
  const resultsSheet = ss.getSheetByName("Results");
  const formResponsesSheet = ss.getSheetByName("FormResponses");

  // TemporaryとResultsシートの内容をクリア
  tempSheet.clearContents();
  resultsSheet.clearContents();
  Logger.log("TemporaryとResultsシートをクリアしました。");

  // SongsテーブルからデータをコピーしてTemporaryシートに貼り付け
  const songsData = songsSheet.getDataRange().getValues();
  tempSheet.getRange(1, 1, songsData.length, songsData[0].length).setValues(songsData);
  Logger.log("SongsシートからデータをTemporaryシートにコピーしました。行数: " + songsData.length);

  // Temporaryシートの1行目（見出し行）を削除
  tempSheet.deleteRow(1);
  Logger.log("Temporaryシートの見出し行を削除しました。");

  // フォームから条件を取得
  const lastRow = formResponsesSheet.getLastRow();
  const minLevel = formResponsesSheet.getRange(lastRow, 2).getValue();
  const maxLevel = formResponsesSheet.getRange(lastRow, 3).getValue();
  const unitCondition = formResponsesSheet.getRange(lastRow, 5).getValue();
  const typeCondition = formResponsesSheet.getRange(lastRow, 4).getValue();
  const mvCondition = formResponsesSheet.getRange(lastRow, 6).getValue();
  const mvPeople = formResponsesSheet.getRange(lastRow, 9).getValue();
  const levelData = formResponsesSheet.getRange(lastRow, 7).getValue();
  const specialCondition = formResponsesSheet.getRange(lastRow, 8).getValue();
  const outputCount = formResponsesSheet.getRange(lastRow, 10).getValue();

  Logger.log("取得した条件: 最小レベル=" + minLevel + ", 最大レベル=" + maxLevel + ", ユニット=" + unitCondition + ", タイプ=" + typeCondition + ", MV人数=" + mvPeople + ", 出力曲数=" + outputCount);

  let tempData = tempSheet.getDataRange().getValues();
  Logger.log("Temporaryシートからのデータ行数: " + tempData.length);

  // レベルの確認用配列
  const levels = ["easy", "normal", "hard", "expert", "master", "append"];
  if (levelData !== "") {
    const hasLevel = {
      easy: levelData.includes("easy"),
      normal: levelData.includes("normal"),
      hard: levelData.includes("hard"),
      expert: levelData.includes("expert"),
      master: levelData.includes("master"),
      append: levelData.includes("append")
    };

    tempData = tempData.filter(row => {
    const levels = row.slice(5, 11); // F列からK列を取得
    if (!hasLevel.easy) levels[0] = "-"; // easyがない場合
    if (!hasLevel.normal) levels[1] = "-"; // normalがない場合
    if (!hasLevel.hard) levels[2] = "-"; // hardがない場合
    if (!hasLevel.expert) levels[3] = "-"; // expertがない場合
    if (!hasLevel.master) levels[4] = "-"; // masterがない場合
    if (!hasLevel.append) levels[5] = "-"; // appendがない場合
    
    // 更新したlevelsを元のrowに反映
    row.splice(5, 6, ...levels); 

    // F列からK列全てが-であればその行を削除
    return !levels.every(level => level === "-");
    });
  }

// レベルフィルタリング
if (minLevel === "" && maxLevel === "") {
  Logger.log("レベルフィルタリングをスキップしました。");
} else {
  if (minLevel > maxLevel) {
    Logger.log("入力が不正なため、レベルフィルタリングをスキップします。");
   // 出力の文章を作成
    let outputMessages = [];
    outputMessages.push(`> 最小レベル=${minLevel}, 最大レベル=${maxLevel}`)
    outputMessages.push(`> 難易度=${levelData}`)
    outputMessages.push(`> ユニット=${unitCondition}`)
    outputMessages.push(`> 楽曲タイプ=${typeCondition}`)
    outputMessages.push(`> MVタイプ=${mvCondition}`)
    outputMessages.push(`> 3DMV人数=${mvPeople}`)
    outputMessages.push(`> 特殊=${specialCondition}`)
    outputMessages.push(`> 楽曲数=${outputCount}`)
    outputMessages.push(`# エラー:最小レベルと最大レベルの値が不正です。`)
    // Discordに投稿
    postToDiscord(outputMessages.join("\n"));
    return; // 入力が不正な場合は処理をスキップ
  } else {
  tempData = tempData.filter(row => {
    const levels = row.slice(5, 11); // F列からK列を取得
    let isValid = false; // 有効なレベルがあるかどうかを示すフラグ

    for (let j = 0; j < levels.length; j++) {
      // 片方のみが空欄の場合、それぞれの条件でフィルタリング
      if (levels[j] !== "-") {
        if (minLevel === "") {
          // maxLevelのみが設定されている場合
          if (levels[j] <= maxLevel) {
            isValid = true;
          } else {
            levels[j] = "-";
          }
        } else if (maxLevel === "") {
          // minLevelのみが設定されている場合
          if (levels[j] >= minLevel) {
            isValid = true;
          } else {
            levels[j] = "-";
          }
        } else {
          // 両方が設定されている場合
          if (levels[j] >= minLevel && levels[j] <= maxLevel) {
            isValid = true;
          } else {
            levels[j] = "-";
          }
        }
      }
    }

    row.splice(5, 6, ...levels); // 更新したlevelsを元のrowに反映
    return isValid; // 有効なレベルがあればその行を残す
  });

  Logger.log("レベルフィルタリングを完了しました。");
}

  // 3DMVフィルタリング
  if (mvPeople !== "") {
    tempData = tempData.filter(row => {
      const mvCount = row[6];
      return mvCount == mvPeople;
    });
    Logger.log("3DMVフィルタリング後のデータ行数: " + tempData.length);
  }

  // 楽曲タイプフィルタリング
  if (typeCondition !== "") {
    if (typeCondition.indexOf("既存曲") === -1) {
      tempData = tempData.filter(row => row[2] !== "既");
    }
    if (typeCondition.indexOf("書き下ろし曲") === -1) {
      tempData = tempData.filter(row => row[2] !== "書");
    }
    if (typeCondition.indexOf("公募曲") === -1) {
      tempData = tempData.filter(row => row[2] !== "公");
    }
    Logger.log("楽曲タイプフィルタリング後のデータ行数: " + tempData.length);
   } else {
    Logger.log("楽曲タイプフィルタリングをスキップしました。");
  }

  // ユニットフィルタリング
  if (unitCondition === "") {
    tempData = tempData.filter(row => row[3] !== "0_VS" && row[3] !== "1_L/n" && row[3] !== "2_MMJ" && row[3] !== "3_VBS" && row[3] !== "4_WxS" && row[3] !== "5_25" && row[3] !== "9_oth");
   } else {
    if (unitCondition.indexOf("バーチャルシンガー") === -1) {
      tempData = tempData.filter(row => row[3] !== "0_VS");
    }
    if (unitCondition.indexOf("Leo/need") === -1) {
      tempData = tempData.filter(row => row[3] !== "1_L/n");
    }
    if (unitCondition.indexOf("MORE MORE JUMP!") === -1) {
      tempData = tempData.filter(row => row[3] !== "2_MMJ");
    }
    if (unitCondition.indexOf("Vivid BAD SQUAD") === -1) {
      tempData = tempData.filter(row => row[3] !== "3_VBS");
    }
    if (unitCondition.indexOf("ワンダーランズ×ショウタイム") === -1) {
      tempData = tempData.filter(row => row[3] !== "4_WxS");
    }
    if (unitCondition.indexOf("25時、ナイトコードで。") === -1) {
      tempData = tempData.filter(row => row[3] !== "5_25");
    }
    if (unitCondition.indexOf("その他") === -1) {
      tempData = tempData.filter(row => row[3] !== "9_oth");
    Logger.log("ユニットフィルタリングを実行します。");
   } else {
    Logger.log("ユニットフィルタリングをスキップしました。");
   }
  }
}

// 特殊フィルタリング
if (specialCondition !== "") {
  const cutoffDate = new Date("2023-09-29");

  tempData = tempData.filter(row => {
    const dateText = String(row[18]); // TemporaryテーブルのS列（インデックス18）から日付テキストを取得し、文字列に変換
    const songDate = new Date(dateText.replace(/-/g, '/')); // 文字列を日付オブジェクトに変換

    if (isNaN(songDate)) {
      Logger.log("不正な日付が検出された行があり、フィルタリング対象外とします。行内容：" + row);
      return false; // 不正な日付形式の場合、行を除外
    }

    if (specialCondition === "3周年アップデート以前の楽曲で絞り込む(トレースノーツが出る前)") {
      return songDate < cutoffDate; // 2023/09/29以前の楽曲を残す
    } else if (specialCondition === "3周年アップデート以降の楽曲で絞り込む(トレースノーツが出た後)") {
      return songDate >= cutoffDate; // 2023/09/29以降の楽曲を残す
    }

    return false; // 条件に合わない場合は行を除外
  });

  Logger.log("特殊フィルタリング後のデータ行数: " + tempData.length);
} else {
  Logger.log("特殊フィルタリングをスキップしました。");
}
  // ここでtempDataが空かどうかをチェック
  if (tempData.length === 0) {
    Logger.log("フィルタリングの結果、曲が見つかりませんでした。");
    // 出力の文章を作成
    let outputMessages = [];
    outputMessages.push(`> 最小レベル=${minLevel}, 最大レベル=${maxLevel}`)
    outputMessages.push(`> 難易度=${levelData}`)
    outputMessages.push(`> ユニット=${unitCondition}`)
    outputMessages.push(`> 楽曲タイプ=${typeCondition}`)
    outputMessages.push(`> MVタイプ=${mvCondition}`)
    outputMessages.push(`> 3DMV人数=${mvPeople}`)
    outputMessages.push(`> 特殊=${specialCondition}`)
    outputMessages.push(`> 楽曲数=${outputCount}`)
    outputMessages.push(`# エラー:曲が見つかりませんでした。`)
    // Discordに投稿
    postToDiscord(outputMessages.join("\n"));
    return; // 曲が見つからなかった場合は処理をスキップ
  }

  // outputCountが正しい範囲かを確認
  const countToWrite = Math.min(outputCount, tempData.length);
  Logger.log("出力する曲数: " + countToWrite);

  if (countToWrite > 0) {
    // フィルタリングされたデータをランダムに並び替え
    tempData = shuffleArray(tempData);
    // Resultsシートに曲を出力
    resultsSheet.getRange(1, 1, countToWrite, tempData[0].length).setValues(tempData.slice(0, countToWrite));
    Logger.log("Resultsシートに曲を出力しました。");

    // 出力の文章を作成
    let outputMessages = [];
    outputMessages.push(`> 最小レベル=${minLevel}, 最大レベル=${maxLevel}`)
    outputMessages.push(`> 難易度=${levelData}`)
    outputMessages.push(`> ユニット=${unitCondition}`)
    outputMessages.push(`> 楽曲タイプ=${typeCondition}`)
    outputMessages.push(`> MVタイプ=${mvCondition}`)
    outputMessages.push(`> 3DMV人数=${mvPeople}`)
    outputMessages.push(`> 特殊=${specialCondition}`)
    outputMessages.push(`> 楽曲数=${outputCount}`)

    for (let i = 0; i < countToWrite; i++) {
      const row = tempData[i];
      const diff = levels.find((level, index) => row[5 + index] !== "-"); // FからK列までのどれか1つを選ぶ
      const lev = row[5 + levels.indexOf(diff)]; // 選んだレベルの値
      const nam = row[3]; // 楽曲名

      outputMessages.push(`${nam}`);
      outputMessages.push(`-#  ${diff}(Lv. ${lev})`);
    }
      // Discordに投稿
    postToDiscord(outputMessages.join("\n"));

  } else {
    Logger.log("出力する曲がありません。");
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function postToDiscord(message) {
  const payload = JSON.stringify({ content: message });
  const options = {
    method: "post",
    contentType: "application/json",
    payload: payload
  };
  
  UrlFetchApp.fetch(POST_URL, options);
}
