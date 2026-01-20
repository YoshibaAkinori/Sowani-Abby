// lib/dateUtils.js

/**
 * 1年後の月末を計算
 * 例: 2025/1/20 → 2026/1/31
 *     2025/3/15 → 2026/3/31
 * @param {Date} baseDate - 基準日
 * @returns {Date} - 1年後の月末
 */
export function getExpiryDateOneYearEndOfMonth(baseDate = new Date()) {
  const date = new Date(baseDate);
  
  // 1年後
  date.setFullYear(date.getFullYear() + 1);
  
  // その月の末日を取得（翌月の0日 = 当月の末日）
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed → 1-indexed
  const lastDay = new Date(year, month, 0).getDate();
  
  date.setDate(lastDay);
  
  return date;
}

/**
 * 有効期限を計算（validity_daysがあればそれを使用、なければ1年後月末）
 * @param {Date} purchaseDate - 購入日
 * @param {number|null} validityDays - 有効日数（nullの場合は1年後月末）
 * @returns {Date}
 */
export function calculateExpiryDate(purchaseDate = new Date(), validityDays = null) {
  // validityDaysが指定されていない、または365以上なら1年後月末
  if (!validityDays || validityDays >= 365) {
    return getExpiryDateOneYearEndOfMonth(purchaseDate);
  }
  
  // それ以外は従来通り日数加算
  const expiryDate = new Date(purchaseDate);
  expiryDate.setDate(expiryDate.getDate() + validityDays);
  return expiryDate;
}
