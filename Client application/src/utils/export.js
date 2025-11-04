/**
 * 数据导出工具类
 * 支持导出为Excel和CSV格式
 */

/**
 * 导出为CSV格式
 * @param {Array} data - 要导出的数据数组
 * @param {Array} headers - 表头数组
 * @param {string} filename - 导出文件名（不含扩展名）
 */
export function exportToCSV(data, headers, filename = 'export') {
  try {
    // 创建CSV内容
    let csvContent = '\uFEFF'; // 添加BOM以支持中文
    
    // 添加表头
    csvContent += headers.join(',') + '\n';
    
    // 添加数据行
    data.forEach(row => {
      const rowData = headers.map(header => {
        // 获取单元格值
        let cellValue = row[header] || '';
        
        // 处理特殊字符
        if (typeof cellValue === 'string' && (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n'))) {
          // 如果包含逗号、引号或换行符，需要用引号包裹，并转义内部引号
          cellValue = `"${cellValue.replace(/"/g, '""')}"`;
        }
        
        return cellValue;
      });
      
      csvContent += rowData.join(',') + '\n';
    });
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    console.log(`CSV文件导出成功: ${filename}.csv`);
    return true;
  } catch (error) {
    console.error('CSV导出失败:', error);
    return false;
  }
}

/**
 * 导出为Excel格式（使用HTML表格模拟）
 * @param {Array} data - 要导出的数据数组
 * @param {Array} headers - 表头数组
 * @param {string} filename - 导出文件名（不含扩展名）
 * @param {string} title - 表格标题
 */
export function exportToExcel(data, headers, filename = 'export', title = '') {
  try {
    // 创建HTML表格
    let excelContent = '<html>';
    excelContent += '<head>';
    excelContent += '<meta charset="utf-8">';
    excelContent += '<style>';
    excelContent += 'table { border-collapse: collapse; width: 100%; }';
    excelContent += 'th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }';
    excelContent += 'th { background-color: #f2f2f2; font-weight: bold; }';
    excelContent += '</style>';
    excelContent += '</head>';
    excelContent += '<body>';
    
    // 添加标题
    if (title) {
      excelContent += `<h2>${title}</h2>`;
    }
    
    excelContent += '<table>';
    
    // 添加表头
    excelContent += '<tr>';
    headers.forEach(header => {
      excelContent += `<th>${header}</th>`;
    });
    excelContent += '</tr>';
    
    // 添加数据行
    data.forEach(row => {
      excelContent += '<tr>';
      headers.forEach(header => {
        let cellValue = row[header] || '';
        
        // 处理特殊字符，避免破坏HTML结构
        if (typeof cellValue === 'string') {
          cellValue = cellValue.replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;');
        }
        
        excelContent += `<td>${cellValue}</td>`;
      });
      excelContent += '</tr>';
    });
    
    excelContent += '</table>';
    excelContent += '</body>';
    excelContent += '</html>';
    
    // 创建Blob对象
    const blob = new Blob([excelContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8;' 
    });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    link.style.visibility = 'hidden';
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    console.log(`Excel文件导出成功: ${filename}.xls`);
    return true;
  } catch (error) {
    console.error('Excel导出失败:', error);
    return false;
  }
}

/**
 * 导出费用明细数据
 * @param {Array} expenses - 费用明细数据
 * @param {string} format - 导出格式 ('csv' 或 'excel')
 * @param {Object} options - 导出选项
 * @param {string} options.filename - 文件名
 * @param {string} options.title - 表格标题
 * @param {Array} options.dateRange - 日期范围
 */
export function exportExpenseData(expenses, format = 'csv', options = {}) {
  // 默认选项
  const defaultOptions = {
    filename: '费用明细',
    title: '费用明细表',
    dateRange: null
  };
  
  const exportOptions = { ...defaultOptions, ...options };
  
  // 处理文件名，添加日期范围
  if (exportOptions.dateRange && exportOptions.dateRange.length === 2) {
    const startDate = new Date(exportOptions.dateRange[0]).toLocaleDateString('zh-CN');
    const endDate = new Date(exportOptions.dateRange[1]).toLocaleDateString('zh-CN');
    exportOptions.filename = `${exportOptions.filename}_${startDate}_${endDate}`;
    exportOptions.title = `${exportOptions.title} (${startDate} 至 ${endDate})`;
  }
  
  // 处理数据，确保导出格式正确
  const processedData = expenses.map(expense => {
    // 处理参与人列表
    const participants = expense.participants && Array.isArray(expense.participants)
      ? expense.participants.map(p => p.name).join(', ')
      : '';
    
    return {
      '日期': expense.date || '',
      '描述': expense.description || '',
      '分类': expense.category || '',
      '金额': expense.amount || 0,
      '支付人': expense.paidBy || '',
      '参与人': participants
    };
  });
  
  // 表头
  const headers = ['日期', '描述', '分类', '金额', '支付人', '参与人'];
  
  // 根据格式导出
  if (format === 'excel') {
    return exportToExcel(processedData, headers, exportOptions.filename, exportOptions.title);
  } else {
    return exportToCSV(processedData, headers, exportOptions.filename);
  }
}

/**
 * 导出统计数据
 * @param {Object} stats - 统计数据
 * @param {string} format - 导出格式 ('csv' 或 'excel')
 * @param {Object} options - 导出选项
 */
export function exportStatsData(stats, format = 'csv', options = {}) {
  // 默认选项
  const defaultOptions = {
    filename: '费用统计',
    title: '费用统计表'
  };
  
  const exportOptions = { ...defaultOptions, ...options };
  
  // 处理数据
  const processedData = [
    {
      '统计项': '总支出',
      '数值': stats.totalAmount || 0,
      '单位': '元'
    },
    {
      '统计项': '平均支出',
      '数值': stats.averageAmount || 0,
      '单位': '元'
    },
    {
      '统计项': '支出笔数',
      '数值': stats.totalCount || 0,
      '单位': '笔'
    },
    {
      '统计项': '最大单笔支出',
      '数值': stats.maxAmount || 0,
      '单位': '元'
    }
  ];
  
  // 表头
  const headers = ['统计项', '数值', '单位'];
  
  // 根据格式导出
  if (format === 'excel') {
    return exportToExcel(processedData, headers, exportOptions.filename, exportOptions.title);
  } else {
    return exportToCSV(processedData, headers, exportOptions.filename);
  }
}

// 导出默认对象
export default {
  exportToCSV,
  exportToExcel,
  exportExpenseData,
  exportStatsData
};