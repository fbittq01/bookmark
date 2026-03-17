require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const data = require('./data');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error('Lỗi: Chưa cung cấp TELEGRAM_TOKEN trong file .env');
    process.exit(1);
}

// Khởi tạo Express app (có thể dùng để thiết lập Webhook, health check...)
const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo bot - mặc định dùng long polling cho việc phát triển
const bot = new TelegramBot(token, { polling: true });

// Khởi tạo file dữ liệu
data.init().then(() => {
    console.log('Đã khởi tạo bảng dữ liệu bookmark cục bộ (bookmarks.txt).');
});

// Lệnh /start và /help
bot.onText(/\/(start|help)/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
Chào mừng đến với Tele Bookmark Bot! 🔖
Tôi có thể giúp bạn lưu trữ và tìm kiếm các link (bookmark) hữu ích.

🚀 **Các lệnh hỗ trợ:**
/add <url> [mô tả] - Thêm bookmark mới
/list - Xem toàn bộ danh sách
/search <từ khoá> - Tìm kiếm
/delete <ID> - Xoá bookmark theo ID
/edit <ID> <url mới> [mô tả mới] - Cập nhật bookmark theo ID
hoặc đơn giản là cứ dán URL vào chat, tôi sẽ tự lưu lại!
    `;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Lệnh /add
bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();
    const parts = input.split(' ');
    const url = parts[0];
    const description = parts.slice(1).join(' ');

    await data.addBookmark(url, description);
    bot.sendMessage(chatId, `✅ Đã lưu: ${url}`);
});

// Nhận diện URL gửi trực tiếp (không dùng lệnh /add)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // Bỏ qua nếu là các lệnh command bắt đầu bằng /
    if (text.startsWith('/')) return;

    // Biểu thức chính quy kiểm tra định dạng web URL đơn giản
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);

    if (urls && urls.length > 0) {
        for (const url of urls) {
            // Lấy phần text còn lại làm description bổ sung nếu có
            const description = text.replace(url, '').trim();
            await data.addBookmark(url, description);
        }
        bot.sendMessage(chatId, `✅ Đã tự động lưu ${urls.length} liên kết mới!`);
    }
});

// Lệnh /list
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const bookmarks = await data.listBookmarks();
    
    if (bookmarks.length === 0) {
        return bot.sendMessage(chatId, '📭 Danh sách trống. Hãy thêm một vài link để lưu nhé!');
    }

    // Có thể phân trang nếu danh sách quá dài, nhưng tạm thời nối chuỗi.
    const response = '📑 *Danh sách bookmark hiện tại:*\n\n' + bookmarks.map((b, i) => `[${i + 1}] ${b}`).join('\n');
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Lệnh /search
bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const keyword = match[1].trim();
    
    const results = await data.searchBookmarks(keyword);
    
    if (results.length === 0) {
        return bot.sendMessage(chatId, `🔍 Không tìm thấy kết quả nào với từ khoá "${keyword}".`);
    }

    const response = `🔍 *Kết quả tìm kiếm cho "${keyword}":*\n\n` + results.map(r => `[${r.index}] ${r.text}`).join('\n');
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// Lệnh /delete
bot.onText(/\/delete (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const index = parseInt(match[1].trim(), 10);
    
    const deleted = await data.deleteBookmark(index);
    if (deleted) {
        bot.sendMessage(chatId, `🗑️ Đã xoá thành công bookmark ID [${index}]:\n${deleted}`);
    } else {
        bot.sendMessage(chatId, `❌ Không tìm thấy bookmark nào với ID [${index}]. Hãy dùng lệnh /list để xem ID.`);
    }
});

// Lệnh /edit
bot.onText(/\/edit (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const index = parseInt(match[1].trim(), 10);
    const inputArgs = match[2].trim();
    
    const parts = inputArgs.split(' ');
    const url = parts[0];
    const description = parts.slice(1).join(' ');

    const updated = await data.editBookmark(index, url, description);
    if (updated) {
        bot.sendMessage(chatId, `✏️ Đã cập nhật bookmark ID [${index}] thành:\n${updated}`);
    } else {
        bot.sendMessage(chatId, `❌ Không tìm thấy bookmark với ID [${index}]. Hãy dùng lệnh /list để xem ID.`);
    }
});

// Start Express server (hữu ích cho Healthcheck khi deploy lên Render/Heroku)
app.get('/', (req, res) => {
    res.send('Tele Bookmark Bot đang chạy OK!');
});

app.listen(PORT, () => {
    console.log(`Express Server đang lắng nghe trên cổng ${PORT}`);
    console.log('Bot Telegram đã bắt đầu nhận tin nhắn (Long Polling)...');
});
