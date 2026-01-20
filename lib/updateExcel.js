// lib/updateExcel.js
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * プロジェクトのパスを取得（__dirnameベース）
 */
function getProjectPaths() {
  // lib/ の親ディレクトリ = プロジェクトルート
  const projectRoot = path.resolve(__dirname, '..');
  
  const templateDir = path.join(projectRoot, 'data', 'excel', 'templates');
  const outputDir = path.join(projectRoot, 'public', 'downloads');
  
  console.log('[Excel] projectRoot:', projectRoot);
  console.log('[Excel] templateDir:', templateDir);
  console.log('[Excel] outputDir:', outputDir);
  
  // ディレクトリが存在しない場合は作成
  [templateDir, outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log('[Excel] ディレクトリ作成:', dir);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  return { templateDir, outputDir };
}

/**
 * Excelファイルパスを取得（なければテンプレートからコピー）
 */
async function getExcelFile(dateStr) {
  const { templateDir, outputDir } = getProjectPaths();
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  const fileName = `${year}年 ${month.toString().padStart(2, '0')}月売上.xlsx`;
  const filePath = path.join(outputDir, fileName);
  const templatePath = path.join(templateDir, '月次売上テンプレート.xlsx');
  
  console.log('[Excel] fileName:', fileName);
  console.log('[Excel] filePath:', filePath);
  console.log('[Excel] templatePath:', templatePath);
  
  // ファイルが存在しない場合のみテンプレートからコピー
  if (!fs.existsSync(filePath)) {
    console.log('[Excel] ファイルが存在しないためテンプレートからコピー');
    if (!fs.existsSync(templatePath)) {
      console.error('[Excel] テンプレートファイルが見つかりません:', templatePath);
      return { success: false, error: `テンプレートファイルが見つかりません: ${templatePath}` };
    }
    fs.copyFileSync(templatePath, filePath);
    console.log('[Excel] テンプレートからコピー完了');
  }
  
  return { success: true, filePath, fileName };
}

/**
 * 名前と来店回数でExcelの行を検索
 * @param {string} dateStr - 予約日 (YYYY-MM-DD形式)
 * @param {string} customerName - 顧客名
 * @param {number} visitCount - 来店回数
 * @returns {Object} { success, row, filePath, fileName }
 */
export async function findExcelRow(dateStr, customerName, visitCount) {
  try {
    const fileResult = await getExcelFile(dateStr);
    if (!fileResult.success) {
      return fileResult;
    }
    
    const { filePath, fileName } = fileResult;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    const visitCountStr = `${visitCount}回目`;
    
    // 14行目から検索開始
    let currentRow = 14;
    while (currentRow < 1000) {
      const nameCell = worksheet.getCell(`C${currentRow}`).value;
      const visitCell = worksheet.getCell(`H${currentRow}`).value;
      
      // データがない行に到達
      if (nameCell === null || nameCell === undefined || nameCell === '') {
        break;
      }
      
      // 名前と来店回数が一致
      if (nameCell === customerName && visitCell === visitCountStr) {
        return {
          success: true,
          row: currentRow,
          filePath,
          fileName
        };
      }
      
      currentRow++;
    }
    
    return {
      success: false,
      error: '該当する行が見つかりません',
      filePath,
      fileName
    };
    
  } catch (error) {
    console.error('[Excel] 検索エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Excelの行を削除
 * @param {string} dateStr - 予約日 (YYYY-MM-DD形式)
 * @param {string} customerName - 顧客名
 * @param {number} visitCount - 来店回数
 * @returns {Object} { success, message }
 */
export async function deleteExcelRow(dateStr, customerName, visitCount) {
  try {
    console.log('[Excel] 削除開始:', { dateStr, customerName, visitCount });
    
    // まず該当行を検索
    const findResult = await findExcelRow(dateStr, customerName, visitCount);
    
    if (!findResult.success) {
      console.log('[Excel] 削除対象の行が見つかりません（既に削除済みの可能性）');
      return {
        success: true,
        message: '該当する行が見つかりませんでした'
      };
    }
    
    const { row, filePath, fileName } = findResult;
    console.log('[Excel] 削除対象行:', row);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    // 削除する行の下にあるデータを1行上にシフト
    let currentRow = row;
    while (currentRow < 1000) {
      const nextRowName = worksheet.getCell(`C${currentRow + 1}`).value;
      
      // 次の行にデータがない場合は、現在の行をクリア
      if (nextRowName === null || nextRowName === undefined || nextRowName === '') {
        // 現在の行をクリア
        for (let col = 1; col <= 25; col++) {
          worksheet.getCell(currentRow, col).value = null;
        }
        break;
      }
      
      // 次の行のデータを現在の行にコピー
      for (let col = 1; col <= 25; col++) {
        const sourceCell = worksheet.getCell(currentRow + 1, col);
        const targetCell = worksheet.getCell(currentRow, col);
        targetCell.value = sourceCell.value;
      }
      
      currentRow++;
    }
    
    await workbook.xlsx.writeFile(filePath);
    console.log('[Excel] 削除完了');
    
    return {
      success: true,
      message: `行${row}を削除しました`,
      file_name: fileName,
      deleted_row: row
    };
    
  } catch (error) {
    console.error('[Excel] 行削除エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Excelの行を更新
 * @param {Object} oldData - 検索用の旧データ { date, customer_name, visit_count }
 * @param {Object} newData - 更新用の新データ { date, customer_name, staff_name, visit_count }
 * @returns {Object} { success, message }
 */
export async function updateExcelRow(oldData, newData) {
  try {
    console.log('[Excel] 更新開始:', { oldData, newData });
    
    // まず旧データで該当行を検索
    const findResult = await findExcelRow(oldData.date, oldData.customer_name, oldData.visit_count);
    
    if (!findResult.success) {
      console.log('[Excel] 更新対象の行が見つからないため、新規追加します');
      return await updateExcel(newData);
    }
    
    const { row, filePath, fileName } = findResult;
    console.log('[Excel] 更新対象行:', row);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    // データを更新
    worksheet.getCell(`A${row}`).value = formatDate(newData.date);
    worksheet.getCell(`C${row}`).value = newData.customer_name;
    worksheet.getCell(`E${row}`).value = newData.staff_name;
    worksheet.getCell(`H${row}`).value = `${newData.visit_count}回目`;
    
    await workbook.xlsx.writeFile(filePath);
    console.log('[Excel] 更新完了');
    
    return {
      success: true,
      message: `行${row}を更新しました`,
      file_name: fileName,
      row: row
    };
    
  } catch (error) {
    console.error('[Excel] 行更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
    console.log('[Excel] 追加開始:', bookingData);
    
    const fileResult = await getExcelFile(bookingData.date);
    if (!fileResult.success) {
      return fileResult;
    }
    
    const { filePath, fileName } = fileResult;
    const workbook = new ExcelJS.Workbook();
    
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
    
    console.log('[Excel] 挿入行:', insertRow, '既存データ間挿入:', foundPosition);
    
    // 既存データの間に挿入する場合
    if (foundPosition) {
      // 挿入位置以降の行を1行下にずらす
      let lastRow = insertRow;
      while (worksheet.getCell(`A${lastRow + 1}`).value !== null && 
             worksheet.getCell(`A${lastRow + 1}`).value !== undefined &&
             worksheet.getCell(`A${lastRow + 1}`).value !== '' &&
             lastRow < 1000) {
        lastRow++;
      }
      
      // 下から順に1行ずつ下にコピー（A〜Y列）
      for (let row = lastRow; row >= insertRow; row--) {
        for (let col = 1; col <= 25; col++) {
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
        const match = merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (match) {
          const startCol = match[1];
          const startRow = parseInt(match[2]);
          const endCol = match[3];
          const endRow = parseInt(match[4]);
          
          if (startRow >= insertRow) {
            mergesToRemove.push(merge);
            mergesToAdd.push(`${startCol}${startRow + 1}:${endCol}${endRow + 1}`);
          }
        }
      });
      
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
    console.log('[Excel] 追加完了 - 行:', insertRow);
    
    return {
      success: true,
      file_name: fileName,
      row: insertRow,
      file_path: filePath
    };
    
  } catch (error) {
    console.error('[Excel] 更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default updateExcel;