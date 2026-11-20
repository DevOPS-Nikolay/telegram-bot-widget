const request = require('request');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
require('dotenv').config();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

const TEMP_UPLOAD_DIR = path.join(__dirname, 'tmp', 'intergram');
const TEMP_FILE_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDirectory(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        return;
    }

    const parentPath = path.dirname(directoryPath);
    if (parentPath !== directoryPath && !fs.existsSync(parentPath)) {
        ensureDirectory(parentPath);
    }

    fs.mkdirSync(directoryPath);
}

function cleanupExpiredTempFiles(directoryPath, maxAgeMs) {
    ensureDirectory(directoryPath);

    const now = Date.now();
    const deletedFiles = [];

    if (!fs.existsSync(directoryPath)) {
        return deletedFiles;
    }

    fs.readdirSync(directoryPath).forEach((entry) => {
        const fullPath = path.join(directoryPath, entry);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            deletedFiles.push.apply(deletedFiles, cleanupExpiredTempFiles(fullPath, maxAgeMs));
            if (fs.readdirSync(fullPath).length === 0) {
                fs.rmdirSync(fullPath);
            }
            return;
        }

        if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
            deletedFiles.push(fullPath);
        }
    });

    return deletedFiles;
}

ensureDirectory(TEMP_UPLOAD_DIR);
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    optionsSuccessStatus: 204
}));
app.use('/files', express.static(TEMP_UPLOAD_DIR, { maxAge: '1h' }));
app.use(compression());
app.use(express.static('dist', {index: 'demo.html', maxage: '4h'}));
app.use('/chat', express.static('dist', {index: 'chat.html', maxage: '4h'}));
app.use(bodyParser.json());

setInterval(function() {
    try {
        cleanupExpiredTempFiles(TEMP_UPLOAD_DIR, TEMP_FILE_TTL_MS);
    } catch (error) {
        console.error('temp file cleanup error', error);
    }
}, 60 * 60 * 1000);

const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const pendingMessages = new Map();

function getPendingKey(chatId, userId) {
    return chatId + ':' + userId;
}

function prunePendingMessages() {
    const now = Date.now();
    for (const [key, queuedMessages] of pendingMessages.entries()) {
        const validMessages = queuedMessages.filter((msg) => now - msg.ts < MESSAGE_TTL_MS);
        if (validMessages.length) {
            pendingMessages.set(key, validMessages);
        } else {
            pendingMessages.delete(key);
        }
    }
}

function enqueuePendingMessage(chatId, userId, msg) {
    prunePendingMessages();
    const key = getPendingKey(chatId, userId);
    const queuedMessages = pendingMessages.get(key) || [];
    queuedMessages.push(msg);
    pendingMessages.set(key, queuedMessages);
}

function flushPendingMessages(chatId, userId, socket) {
    prunePendingMessages();
    const key = getPendingKey(chatId, userId);
    const queuedMessages = pendingMessages.get(key) || [];

    if (!queuedMessages.length) {
        return;
    }

    queuedMessages.forEach((msg) => {
        socket.emit(chatId + '-' + userId, msg);
    });

    pendingMessages.delete(key);
}

function getConfiguredChatId() {
    const chatId = process.env.INTERGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    if (!chatId || !String(chatId).trim()) {
        throw new Error('INTERGRAM_CHAT_ID is not configured on the server.');
    }

    return String(chatId).trim();
}

function buildTempFileName(originalName, suffix) {
    const extension = path.extname(originalName || 'image.jpg') || '.jpg';
    const base = (path.basename(originalName || 'image.jpg', extension) || 'image')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 30) || 'image';

    return base + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + suffix + extension;
}

function saveTelegramPhotoToTemp(fileId, callback) {
    const getFileUrl = 'https://api.telegram.org/bot' + process.env.TELEGRAM_TOKEN + '/getFile?file_id=' + encodeURIComponent(fileId);

    request.get(getFileUrl, function(error, response, body) {
        if (error) {
            return callback(error);
        }

        try {
            const data = JSON.parse(body);
            if (!data.ok || !data.result || !data.result.file_path) {
                return callback(new Error('Telegram file lookup failed'));
            }

            const filePath = data.result.file_path;
            const fileUrl = 'https://api.telegram.org/file/bot' + process.env.TELEGRAM_TOKEN + '/' + filePath;

            request.get({ url: fileUrl, encoding: null }, function(fileError, fileResponse, buffer) {
                if (fileError) {
                    return callback(fileError);
                }

                const originalName = path.basename(filePath);
                const originalPath = path.join(TEMP_UPLOAD_DIR, buildTempFileName(originalName, '-original'));
                const thumbPath = path.join(TEMP_UPLOAD_DIR, buildTempFileName(originalName, '-thumb').replace(/\.[a-z0-9]+$/i, '.jpg'));
                const originalUrl = '/files/' + path.basename(originalPath);
                const thumbUrl = '/files/' + path.basename(thumbPath);

                fs.writeFileSync(originalPath, buffer);

                sharp(buffer)
                    .resize(320, null, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toFile(thumbPath, function(thumbError) {
                        if (thumbError) {
                            return callback(thumbError);
                        }

                        callback(null, {
                            thumbUrl: thumbUrl,
                            originalUrl: originalUrl
                        });
                    });
            });
        } catch (parseError) {
            callback(parseError);
        }
    });
}

app.get(['/config', '/chat/config'], cors(), function(req, res) {
    try {
        const payload = JSON.stringify({
            chatId: getConfiguredChatId()
        });
        res.status(200).type('application/json').send(payload);
    } catch (e) {
        console.error('config error', e.message);
        res.status(500).type('application/json').send(JSON.stringify({
            error: 'INTERGRAM_CHAT_ID is not configured on the backend.'
        }));
    }
});

// handle admin Telegram messages
app.post('/hook', function(req, res){
    try {
        const message = req.body.message || req.body.channel_post;
        const chatId = message.chat.id;
        const name = "Администратор";
        const text = message.text || "";
        const reply = message.reply_to_message;

        if (message.photo && !text) {
            const photo = message.photo[message.photo.length - 1];
            saveTelegramPhotoToTemp(photo.file_id, function(photoError, imageUrl) {
                if (photoError) {
                    console.error('photo download error', photoError);
                    return;
                }

                const payload = {
                    id: 'admin-' + Date.now() + '-' + Math.random().toString(16).slice(2),
                    name,
                    type: 'photo',
                    imageUrl: imageUrl.thumbUrl,
                    originalUrl: imageUrl.originalUrl,
                    caption: message.caption || '',
                    from: 'admin',
                    ts: Date.now()
                };

                const replyText = (reply && (reply.text || reply.caption)) || '';
                const userId = replyText ? replyText.split(':')[0].trim() : null;
                if (userId && io.sockets.adapter.rooms && io.sockets.adapter.rooms[userId]) {
                    io.to(userId).emit(chatId + "-" + userId, payload);
                } else if (userId) {
                    enqueuePendingMessage(chatId, userId, payload);
                } else {
                    io.emit(chatId, payload);
                }
            });

            res.statusCode = 200;
            res.end();
            return;
        }

        if (text.startsWith("/start")) {
            console.log("/start chatId " + chatId);
            sendTelegramMessage(chatId,
                "*Welcome to Intergram* \n" +
                "Your unique chat id is `" + chatId + "`\n" +
                "Use it to link between the embedded chat and this telegram chat",
                "Markdown");
        } else if (reply) {
            let replyText = (reply.text || reply.caption || "");
            let userId = replyText ? replyText.split(':')[0].trim() : "";
            const payload = {
                id: 'admin-' + Date.now() + '-' + Math.random().toString(16).slice(2),
                name,
                text,
                from: 'admin',
                ts: Date.now()
            };

            if (userId && io.sockets.adapter.rooms && io.sockets.adapter.rooms[userId]) {
                io.to(userId).emit(chatId + "-" + userId, payload);
            } else if (userId) {
                enqueuePendingMessage(chatId, userId, payload);
            } else {
                io.emit(chatId, payload);
            }
        } else if (text){
            io.emit(chatId, {name, text, from: 'admin'});
        }

    } catch (e) {
        console.error("hook error", e, req.body);
    }
    res.statusCode = 200;
    res.end();
});

// handle chat visitors websocket messages
io.on('connection', function(socket){

    socket.on('register', function(registerMsg){
        let userId = registerMsg.userId;
        let chatId = getConfiguredChatId();
        let messageReceived = false;
        socket.join(userId);
        flushPendingMessages(chatId, userId, socket);
        console.log("useId " + userId + " connected to chatId " + chatId);

        if (socket.__intergramBound) {
            return;
        }
        socket.__intergramBound = true;

        socket.on('message', function(msg) {
            messageReceived = true;
            io.to(userId).emit(chatId + "-" + userId, msg);

            if (msg.type === 'photo') {
                return;
            }

            let visitorName = msg.visitorName ? "[" + msg.visitorName + "]: " : "";
            sendTelegramMessage(chatId, userId + ":" + visitorName + " " + msg.text);
        });

        socket.on('disconnect', function(){
            if (messageReceived) {
                sendTelegramMessage(chatId, userId + ": User closed the chat window.");
            }
        });
    });

});

app.post(['/api/send-photo', '/chat/api/send-photo'], upload.single('photo'), function(req, res) {
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No photo file provided.' });
    }

    const mimeType = file.mimetype || 'image/jpeg';
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].indexOf(mimeType) === -1) {
        return res.status(400).json({ error: 'Only image files are allowed.' });
    }

    const originalFileName = buildTempFileName(file.originalname || 'photo.jpg', '-original');
    const originalPath = path.join(TEMP_UPLOAD_DIR, originalFileName);
    const thumbPath = path.join(TEMP_UPLOAD_DIR, buildTempFileName(file.originalname || 'photo.jpg', '-thumb').replace(/\.[a-z0-9]+$/i, '.jpg'));
    const originalUrl = '/files/' + path.basename(originalPath);
    const thumbUrl = '/files/' + path.basename(thumbPath);
    const userId = req.body.userId || '';
    const visitorName = req.body.visitorName || '';
    const photoCaption = userId + ':' + (visitorName ? '[' + visitorName + ']: ' : '') + 'Фото';

    fs.writeFileSync(originalPath, file.buffer);

    sharp(file.buffer)
        .resize(320, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath, function(thumbError) {
            if (thumbError) {
                console.error('thumbnail error', thumbError);
                return res.status(500).json({ error: 'Failed to create thumbnail.' });
            }

            const chatId = getConfiguredChatId();
            const formData = {
                chat_id: chatId,
                caption: photoCaption,
                photo: {
                    value: fs.createReadStream(originalPath),
                    options: {
                        filename: path.basename(originalFileName),
                        contentType: mimeType
                    }
                }
            };

            request.post({
                url: 'https://api.telegram.org/bot' + process.env.TELEGRAM_TOKEN + '/sendPhoto',
                formData: formData
            }, function(error, response, body) {
                if (error) {
                    console.error('telegram sendPhoto error', error);
                    return res.status(500).json({ error: 'Failed to send image to Telegram.' });
                }

                try {
                    const data = JSON.parse(body || '{}');
                    if (!data.ok) {
                        return res.status(500).json({ error: data.description || 'Telegram sendPhoto failed.' });
                    }

                    const result = data.result || {};
                    const fileId = result.photo && result.photo.length ? result.photo[result.photo.length - 1].file_id : null;

                    return res.status(200).json({
                        ok: true,
                        imageUrl: thumbUrl,
                        originalUrl: originalUrl,
                        fileId: fileId,
                        caption: ''
                    });
                } catch (parseError) {
                    console.error('telegram response parse error', parseError, body);
                    return res.status(500).json({ error: 'Telegram response invalid.' });
                }
            });
        });
});

function sendTelegramMessage(chatId, text, parseMode) {
    request
        .post('https://api.telegram.org/bot' + process.env.TELEGRAM_TOKEN + '/sendMessage')
        .form({
            "chat_id": chatId,
            "text": text,
            "parse_mode": parseMode
        });
}

app.post(['/usage-start', '/chat/usage-start'], cors(), function(req, res) {
    console.log('usage from', req.query.host);
    res.statusCode = 200;
    res.end();
});

// left here until the cache expires
app.post(['/usage-end', '/chat/usage-end'], cors(), function(req, res) {
    res.statusCode = 200;
    res.end();
});

app.use(function(error, req, res, next) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            ok: false,
            error: 'Файл слишком большой. Максимум 10 МБ.'
        });
    }

    if (error) {
        console.error('upload error', error);
        return res.status(500).json({
            ok: false,
            error: 'Upload failed.'
        });
    }

    next();
});

function startServer(port) {
    const listeningPort = port !== undefined ? port : (process.env.PORT || 3000);
    return http.listen(listeningPort, function(){
        console.log('listening on port:' + listeningPort);
    });
}

if (require.main === module) {
    startServer();
}

app.get("/.well-known/acme-challenge/:content", (req, res) => {
    res.send(process.env.CERTBOT_RESPONSE);
});

module.exports = {
    app,
    http,
    startServer,
    getConfiguredChatId,
    TEMP_UPLOAD_DIR,
    TEMP_FILE_TTL_MS,
    ensureDirectory,
    cleanupExpiredTempFiles
};
