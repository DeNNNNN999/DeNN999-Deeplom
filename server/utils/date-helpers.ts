/**
 * Вспомогательные функции для работы с датами
 */

/**
 * Проверяет и преобразует строковое представление даты в объект Date
 * Обрабатывает различные форматы дат
 * 
 * @param dateString Строковое представление даты
 * @returns Объект Date или null, если строка не может быть преобразована в Date
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Если в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Если в формате DD.MM.YYYY (русский формат)
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
      const parts = dateString.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Месяцы в JS начинаются с 0
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Если в формате ISO
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Другие распространенные форматы можно обработать здесь
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Преобразует дату в формат ISO строки (или в другой формат, если указан)
 * 
 * @param date Дата для форматирования
 * @param format Формат (по умолчанию ISO)
 * @returns Строковое представление даты
 */
export function formatDate(date: Date | string, format: 'iso' | 'sql' | 'ru' = 'iso'): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Если передана строка, пробуем распарсить её сначала с помощью parseDate
    const parsedDate = parseDate(date);
    if (parsedDate) {
      dateObj = parsedDate;
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }
  
  if (format === 'sql') {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (format === 'ru') {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
  }
  
  return dateObj.toISOString();
}
