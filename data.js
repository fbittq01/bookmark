const fs = require('fs/promises');
const path = require('path');

const filePath = path.join(__dirname, 'bookmarks.txt');

// Đảm bảo file được tạo nếu chưa tồn tại
async function init() {
    try {
        await fs.access(filePath);
    } catch (error) {
        // File không tồn tại, tạo file trống
        await fs.writeFile(filePath, '', 'utf8');
    }
}

// Thêm một bookmark mới
async function addBookmark(url, description) {
    const line = `${url} | ${description || 'Không có mô tả'}\n`;
    await fs.appendFile(filePath, line, 'utf8');
    return true;
}

// Lấy danh sách bookmark
async function listBookmarks() {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        return lines;
    } catch (error) {
        return [];
    }
}

// Tìm kiếm bookmark theo từ khoá
async function searchBookmarks(keyword) {
    try {
        const lines = await listBookmarks();
        const lowerKeyword = keyword.toLowerCase();
        return lines
            .map((line, index) => ({ index: index + 1, text: line }))
            .filter(item => item.text.toLowerCase().includes(lowerKeyword));
    } catch (error) {
        return [];
    }
}

// Xoá bookmark theo index (1-based)
async function deleteBookmark(index) {
    const lines = await listBookmarks();
    if (index < 1 || index > lines.length) return false;
    const deleted = lines.splice(index - 1, 1)[0];
    await fs.writeFile(filePath, lines.length > 0 ? lines.join('\n') + '\n' : '', 'utf8');
    return deleted;
}

// Sửa bookmark theo index (1-based)
async function editBookmark(index, url, description) {
    const lines = await listBookmarks();
    if (index < 1 || index > lines.length) return null;
    const line = `${url} | ${description || 'Không có mô tả'}`;
    lines[index - 1] = line;
    await fs.writeFile(filePath, lines.length > 0 ? lines.join('\n') + '\n' : '', 'utf8');
    return line;
}

module.exports = {
    init,
    addBookmark,
    listBookmarks,
    searchBookmarks,
    deleteBookmark,
    editBookmark
};
