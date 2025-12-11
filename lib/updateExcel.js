// lib/updateExcel.js
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

/**
 * 日付を 'M月D日' 形式に変換
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  } catch {
    return dateStr;
  }
}

/**
 * プロジェクトのパスを取得
 */
function getProjectPaths() {
  const projectRoot = process.cwd();
  
  const templateDir = path.join(projectRoot, 'data', 'excel', 'templates');
  const outputDir = path.join(projectRoot, 'public', 'downloads');
  
  // ディレクトリが存在しない場合は作成
  [templateDir, outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  return { templateDir, outputDir };
}

/**
 * 予約情報をExcelに追記する
 * @param {Object} bookingData - 予約データ
 * @param {string} bookingData.date - 予約日 (YYYY-MM-DD形式)
 * @param {string} bookingData.customer_name - 顧客名
 * @param {string} bookingData.staff_name - スタッフ名
 * @param {number} bookingData.visit_count - 来店回数
 */
export async function updateExcel(bookingData) {
  try {
    const { templateDir, outputDir } = getProjectPaths();
    
    const date = new Date(bookingData.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const fileName = `${year}年 ${month.toString().padStart(2, '0')}月売上.xlsx`;
    const filePath = path.join(outputDir, fileName);  // publicフォルダに直接
    const templatePath = path.join(templateDir, '月次売上テンプレート.xlsx');
    
    const workbook = new ExcelJS.Workbook();
    
    // ファイルが存在しない場合のみテンプレートからコピー
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: `テンプレートファイルが見つかりません: ${templatePath}`
        };
      }
      fs.copyFileSync(templatePath, filePath);
    }
    
    // Excelファイルを読み込み
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    // 新しい予約の日付
    const newDate = new Date(bookingData.date);
    const newMonth = newDate.getMonth() + 1;
    const newDay = newDate.getDate();
    
    // 適切な挿入位置を探す（14行目から）
    let insertRow = 14;
    let currentRow = 14;
    let foundPosition = false;
    
    // 既存のデータを走査して挿入位置を決定
    while (true) {
      const cellValue = worksheet.getCell(`A${currentRow}`).value;
      
      // データがない行に到達したら、ここに挿入
      if (cellValue === null || cellValue === undefined || cellValue === '') {
        insertRow = currentRow;
        break;
      }
      
      try {
        if (typeof cellValue === 'string' && cellValue.includes('月') && cellValue.includes('日')) {
          // "10月27日" 形式から日付を抽出
          const monthStr = cellValue.split('月')[0];
          const dayStr = cellValue.split('月')[1].replace('日', '');
          const existingMonth = parseInt(monthStr);
          const existingDay = parseInt(dayStr);
          
          // 月と日で比較（同じ年内なので年は無視）
          // 新しい日付が既存の日付より前なら、この位置に挿入
          if (newMonth < existingMonth || (newMonth === existingMonth && newDay < existingDay)) {
            insertRow = currentRow;
            foundPosition = true;
            break;
          }
        }
      } catch {
        // パースエラーは無視
      }
      
      currentRow++;
      
      // 安全のため1000行で打ち切り
      if (currentRow > 1000) {
        insertRow = currentRow;
        break;
      }
    }
    
    // 既存データの間に挿入する場合
    if (foundPosition) {
      // 挿入位置の行をコピー元として使う（結合・スタイルを維持）
      const sourceRowNum = insertRow;
      
      // 挿入位置以降の行を1行下にずらす
      // 最終行を探す
      let lastRow = insertRow;
      while (worksheet.getCell(`A${lastRow + 1}`).value !== null && 
             worksheet.getCell(`A${lastRow + 1}`).value !== undefined &&
             worksheet.getCell(`A${lastRow + 1}`).value !== '' &&
             lastRow < 1000) {
        lastRow++;
      }
      
      // 下から順に1行ずつ下にコピー（A〜Y列）
      for (let row = lastRow; row >= insertRow; row--) {
        for (let col = 1; col <= 25; col++) { // A=1 〜 Y=25
          const sourceCell = worksheet.getCell(row, col);
          const targetCell = worksheet.getCell(row + 1, col);
          
          // 値をコピー
          targetCell.value = sourceCell.value;
          
          // スタイルをコピー
          if (sourceCell.style) {
            targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
          }
        }
      }
      
      // 結合セルも1行下にずらす
      const mergesToAdd = [];
      const mergesToRemove = [];
      
      worksheet.model.merges.forEach(merge => {
        // "A14:B14" 形式をパース
        const match = merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (match) {
          const startCol = match[1];
          const startRow = parseInt(match[2]);
          const endCol = match[3];
          const endRow = parseInt(match[4]);
          
          // 挿入位置以降の結合を1行下にずらす
          if (startRow >= insertRow) {
            mergesToRemove.push(merge);
            mergesToAdd.push(`${startCol}${startRow + 1}:${endCol}${endRow + 1}`);
          }
        }
      });
      
      // 古い結合を解除して新しい結合を追加
      mergesToRemove.forEach(merge => {
        try {
          worksheet.unMergeCells(merge);
        } catch (e) { /* 無視 */ }
      });
      
      mergesToAdd.forEach(merge => {
        try {
          worksheet.mergeCells(merge);
        } catch (e) { /* 無視 */ }
      });
      
      // 挿入行に結合を設定
      try {
        worksheet.mergeCells(`A${insertRow}:B${insertRow}`);
        worksheet.mergeCells(`C${insertRow}:D${insertRow}`);
      } catch (e) { /* 既に結合されている場合は無視 */ }
      
      // 挿入行の内容をクリア（スタイルは維持）
      for (let col = 1; col <= 25; col++) {
        worksheet.getCell(insertRow, col).value = null;
      }
    }
    
    // 13行目（ヘッダー行の下）からスタイルをコピー
    const sourceRow = 13;
    const targetColumns = ['A', 'C', 'E', 'H'];
    
    // 細線のボーダースタイル
    const thinBorder = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
    
    // データを書き込み
    worksheet.getCell(`A${insertRow}`).value = formatDate(bookingData.date);
    worksheet.getCell(`C${insertRow}`).value = bookingData.customer_name;
    worksheet.getCell(`E${insertRow}`).value = bookingData.staff_name;
    worksheet.getCell(`H${insertRow}`).value = `${bookingData.visit_count}回目`;
    
    // スタイル適用
    for (const col of targetColumns) {
      const sourceCell = worksheet.getCell(`${col}${sourceRow}`);
      const targetCell = worksheet.getCell(`${col}${insertRow}`);
      
      // フォントをコピー
      if (sourceCell.font) {
        targetCell.font = { ...sourceCell.font };
      }
      
      // 配置をコピー
      if (sourceCell.alignment) {
        targetCell.alignment = { ...sourceCell.alignment };
      }
      
      // 罫線は細線を強制適用
      targetCell.border = thinBorder;
    }
    
    // 保存
    await workbook.xlsx.writeFile(filePath);
    
    return {
      success: true,
      file_name: fileName,
      row: insertRow,
      file_path: filePath
    };
    
  } catch (error) {
    console.error('Excel更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default updateExcel;