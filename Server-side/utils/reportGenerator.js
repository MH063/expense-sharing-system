/**
 * 报告生成工具
 * 提供Excel、CSV和PDF报告生成功能
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * 生成Excel报告
 * @param {Array} data - 报告数据
 * @param {Array} headers - 表头
 * @param {String} fileName - 文件名
 * @returns {Promise<String>} 生成的文件路径
 */
async function generateExcelReport(data, headers, fileName) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    // 添加表头
    worksheet.addRow(headers.map(header => header.title));
    
    // 添加数据
    data.forEach(row => {
      const rowData = headers.map(header => {
        if (header.key.includes('.')) {
          // 处理嵌套对象属性
          const keys = header.key.split('.');
          let value = row;
          for (const key of keys) {
            value = value ? value[key] : '';
          }
          return value;
        }
        return row[header.key];
      });
      worksheet.addRow(rowData);
    });
    
    // 格式化表头
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    
    // 自动调整列宽
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // 生成文件路径
    const filePath = path.join(__dirname, '..', 'reports', `${fileName}.xlsx`);
    
    // 确保reports目录存在
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 保存文件
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  } catch (error) {
    throw new Error(`生成Excel报告失败: ${error.message}`);
  }
}

/**
 * 生成CSV报告
 * @param {Array} data - 报告数据
 * @param {Array} headers - 表头
 * @param {String} fileName - 文件名
 * @returns {Promise<String>} 生成的文件路径
 */
async function generateCsvReport(data, headers, fileName) {
  try {
    // 生成CSV内容
    let csvContent = '';
    
    // 添加表头
    csvContent += headers.map(header => `"${header.title}"`).join(',') + '\n';
    
    // 添加数据
    data.forEach(row => {
      const rowData = headers.map(header => {
        if (header.key.includes('.')) {
          // 处理嵌套对象属性
          const keys = header.key.split('.');
          let value = row;
          for (const key of keys) {
            value = value ? value[key] : '';
          }
          return `"${value}"`;
        }
        return `"${row[header.key] || ''}"`;
      });
      csvContent += rowData.join(',') + '\n';
    });
    
    // 生成文件路径
    const filePath = path.join(__dirname, '..', 'reports', `${fileName}.csv`);
    
    // 确保reports目录存在
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 保存文件
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    return filePath;
  } catch (error) {
    throw new Error(`生成CSV报告失败: ${error.message}`);
  }
}

/**
 * 生成PDF报告
 * @param {Array} data - 报告数据
 * @param {Array} headers - 表头
 * @param {String} fileName - 文件名
 * @param {Object} options - PDF选项
 * @returns {Promise<String>} 生成的文件路径
 */
async function generatePdfReport(data, headers, fileName, options = {}) {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    // 生成文件路径
    const filePath = path.join(__dirname, '..', 'reports', `${fileName}.pdf`);
    
    // 确保reports目录存在
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 创建写入流
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // 添加标题
    doc.fontSize(18).text(options.title || '系统报告', { align: 'center' });
    doc.moveDown();
    
    // 添加生成时间
    doc.fontSize(12).text(`生成时间: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);
    
    // 添加表格数据
    const tableTop = doc.y;
    const rowHeight = 20;
    const columnWidth = 100;
    
    // 添加表头
    headers.forEach((header, i) => {
      doc.rect(50 + i * columnWidth, tableTop, columnWidth, rowHeight).stroke();
      doc.text(header.title, 55 + i * columnWidth, tableTop + 5, { width: columnWidth - 10 });
    });
    
    // 添加数据行
    data.forEach((row, rowIndex) => {
      const rowY = tableTop + rowHeight * (rowIndex + 1);
      headers.forEach((header, colIndex) => {
        doc.rect(50 + colIndex * columnWidth, rowY, columnWidth, rowHeight).stroke();
        
        let value = '';
        if (header.key.includes('.')) {
          // 处理嵌套对象属性
          const keys = header.key.split('.');
          value = row;
          for (const key of keys) {
            value = value ? value[key] : '';
          }
        } else {
          value = row[header.key] || '';
        }
        
        doc.text(String(value), 55 + colIndex * columnWidth, rowY + 5, { width: columnWidth - 10 });
      });
    });
    
    // 结束文档
    doc.end();
    
    // 等待写入完成
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`生成PDF报告失败: ${error.message}`);
  }
}

module.exports = {
  generateExcelReport,
  generateCsvReport,
  generatePdfReport
};