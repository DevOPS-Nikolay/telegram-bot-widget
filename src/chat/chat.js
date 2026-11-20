import * as store from 'store'
import io from 'socket.io-client'

import { h, Component } from 'preact';
import MessageArea from './message-area';

export default class Chat extends Component {

    autoResponseState = 'pristine'; // pristine, set or canceled
    autoResponseTimer = 0;

    constructor(props) {
        super(props);
        this.seenMessageKeys = {};
        this.autoResponseTimer = 0;
        this.autoNoResponseTimer = 0;
        this.state = {
            messages: [],
            isUploadingPhoto: false,
            uploadProgress: 0,
            draft: '',
            sendError: ''
        };

        if (store.enabled) {
            this.messagesKey = 'messages' + '.' + props.chatId + '.' + props.host;
            const storedMessages = store.get(this.messagesKey);
            this.state.messages = Array.isArray(storedMessages) ? storedMessages : [];
        }

        this.state.isUploadingPhoto = false;
        this.state.uploadProgress = 0;
    }

    componentDidMount() {
        document.documentElement.style.setProperty('--chat-accent', this.props.conf.mainColor || '#1f8ceb');
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', this.props.conf.mainColor || '#1f8ceb');

        this.socket = io.connect();
        this.socket.on('connect', () => {
            this.socket.emit('register', {chatId: this.props.chatId, userId: this.props.userId });
            this.setState({sendError: ''});
        });
        this.socket.on('disconnect', () => {
            this.setState({sendError: 'Связь прервана. Сообщение отправится после переподключения.'});
        });
        this.socket.on(this.props.chatId, this.incomingMessage);
        this.socket.on(this.props.chatId+'-'+this.props.userId, this.incomingMessage);

        if (!this.state.messages.length) {
            this.writeToMessages({text: this.props.conf.introMessage, from: 'admin'});
        }
    }

    componentWillUnmount() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
        }
        clearTimeout(this.autoResponseTimer);
        clearTimeout(this.autoNoResponseTimer);
    }

    render({},state) {
        const draft = String(state.draft || '').trim();
        return (
            <div class="chat-app">
                <main class="chat-main" role="log" aria-live="polite" aria-label="История сообщений">
                    <MessageArea messages={state.messages} conf={this.props.conf}/>

                    {state.isUploadingPhoto ? (
                        <div class="upload-status" role="status" aria-live="polite">
                            <div class="upload-status-label">Загружаем фото…</div>
                            <div class="upload-status-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={state.uploadProgress || 0}>
                                <div class="upload-status-fill" style={'width: ' + (state.uploadProgress || 0) + '%'}></div>
                            </div>
                        </div>
                    ) : ''}
                </main>

                {state.sendError ? <div class="chat-notice" role="status">{state.sendError}</div> : ''}

                <div class="composer" role="group" aria-label="Отправка сообщения">
                    <input type="file" accept="image/jpeg,image/png,image/webp" ref={(input) => { this.fileInput = input }}
                           onChange={this.handleImageUpload} class="file-input" aria-label="Выбрать фотографию" />
                    <button class="icon-button photo-button" type="button" onClick={this.handleImageSelect} aria-label="Отправить фотографию" title="Отправить фотографию">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM5 5h14v9l-3.5-3.5-4.2 4.2-2.1-2.1L5 17V5Zm3.5 6A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5Z"/></svg>
                    </button>
                    <input class="textarea" type="text" placeholder={this.props.conf.placeholderText}
                           ref={(input) => { this.input = input }} value={state.draft}
                           onInput={this.handleInput} onKeyDown={this.handleKeyDown}
                           enterKeyHint="send" autocomplete="off" aria-label="Текст сообщения" />
                    <button class="icon-button send-button" type="button" onClick={this.handleSend} aria-label="Отправить сообщение" title="Отправить сообщение" disabled={!draft || state.isUploadingPhoto}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.3V3.7c0-.8.8-1.3 1.5-.9l16 8.3c.8.4.8 1.5 0 1.9l-16 8.2c-.7.4-1.5-.1-1.5-.9Zm2-13.6v4.1l6.2 1.3-6.2 1.3v4.1L18.7 12 5 6.7Z"/></svg>
                    </button>
                </div>
            </div>
        );
    }

    handleInput = (event) => {
        this.setState({draft: event.target.value, sendError: ''});
    };

    handleImageSelect = () => {
        if (!this.state.isUploadingPhoto && this.fileInput) {
            this.fileInput.click();
        }
    };

    handleImageUpload = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
            this.writeToMessages({text: 'Выберите изображение в формате JPG, PNG или WebP.', from: 'admin'});
            event.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.writeToMessages({text: 'Файл слишком большой. Максимум 10 МБ.', from: 'admin'});
            event.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', this.props.userId);
        formData.append('visitorName', this.props.conf.visitorName || '');

        this.setState({isUploadingPhoto: true, uploadProgress: 0, sendError: ''});

        const xhr = new XMLHttpRequest();
        const chatPagePath = window.location.pathname || '';
        const chatBasePath = chatPagePath.replace(/\/chat\.html$/, '').replace(/\/$/, '');
        xhr.open('POST', window.location.origin + (chatBasePath || '') + '/api/send-photo', true);
        xhr.upload.onprogress = (progressEvent) => {
            if (!progressEvent.lengthComputable) return;
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            this.setState({uploadProgress: percent});
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;

            let data = null;
            try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) { data = null; }

            if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
                this.writeToMessages({
                    type: 'photo',
                    imageUrl: data.imageUrl,
                    originalUrl: data.originalUrl,
                    from: 'visitor',
                    visitorName: this.props.conf.visitorName,
                    caption: '',
                    ts: Date.now()
                });
                this.setState({isUploadingPhoto: false, uploadProgress: 100});
                setTimeout(() => this.setState({uploadProgress: 0}), 400);
                return;
            }

            const message = data && data.error ? data.error : 'Ошибка загрузки файла.';
            this.writeToMessages({text: message, from: 'admin'});
            this.setState({isUploadingPhoto: false, uploadProgress: 0, sendError: message});
        };

        xhr.onerror = () => {
            const message = 'Не удалось отправить фотографию. Проверьте соединение.';
            this.writeToMessages({text: message, from: 'admin'});
            this.setState({isUploadingPhoto: false, uploadProgress: 0, sendError: message});
        };

        xhr.onabort = () => {
            this.setState({isUploadingPhoto: false, uploadProgress: 0});
        };

        xhr.send(formData);
        event.target.value = '';
    };

    handleSend = () => {
        const text = this.input ? String(this.input.value).trim() : '';
        if (text) {
            this.sendMessage(text);
        } else {
            this.setState({draft: ''});
        }
    };

    sendMessage = (text) => {
        const cleanText = String(text).trim();
        if (!cleanText || !this.socket || !this.socket.connected) {
            this.setState({sendError: cleanText ? 'Нет соединения. Попробуйте отправить сообщение ещё раз.' : ''});
            return;
        }

        this.socket.send({text: cleanText, from: 'visitor', visitorName: this.props.conf.visitorName});
        this.setState({draft: '', sendError: ''});
        if (this.input) this.input.value = '';

        if (this.autoResponseState === 'pristine') {
            this.autoResponseTimer = setTimeout(() => {
                this.writeToMessages({text: this.props.conf.autoResponse, from: 'admin'});
            }, 500);

            this.autoNoResponseTimer = setTimeout(() => {
                if (this.autoResponseState === 'set') {
                    this.writeToMessages({text: this.props.conf.autoNoResponse, from: 'admin'});
                    this.autoResponseState = 'canceled';
                }
            }, 60 * 1000);
            this.autoResponseState = 'set';
        }
    };

    handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend();
        }
    };

    incomingMessage = (msg) => {
        if (!msg) return;
        const added = this.writeToMessages(msg);
        if (!added || msg.from !== 'admin') return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({type: 'intergram-admin-message', payload: msg}, '*');
        }

        const sound = document.getElementById('messageSound');
        if (sound) {
            const playResult = sound.play();
            if (playResult && typeof playResult.catch === 'function') playResult.catch(function() {});
        }

        if (this.autoResponseState === 'pristine') {
            this.autoResponseState = 'canceled';
        } else if (this.autoResponseState === 'set') {
            this.autoResponseState = 'canceled';
            clearTimeout(this.autoResponseTimer);
            clearTimeout(this.autoNoResponseTimer);
        }
    };

    getMessageKey = (msg) => {
        if (msg && msg.id) return 'id:' + msg.id;
        if (msg && msg.type === 'photo') {
            return 'photo:' + (msg.originalUrl || msg.imageUrl || '') + ':' + (msg.caption || '');
        }
        if (msg && msg.ts) {
            return 'text:' + (msg.from || '') + ':' + (msg.text || '') + ':' + msg.ts;
        }
        return null;
    };

    writeToMessages = (msg) => {
        if (!msg) return;
        const normalized = Object.assign({}, msg);
        if (!normalized.time) normalized.time = new Date(normalized.ts || Date.now());

        const key = this.getMessageKey(normalized);
        if (key && this.seenMessageKeys[key]) return false;
        if (key) this.seenMessageKeys[key] = true;

        const messages = this.state.messages.concat(normalized);
        this.setState({messages: messages});

        if (store.enabled) {
            try {
                store.set(this.messagesKey, messages);
            } catch (e) {
                console.log('failed to add new message to local storage', e);
            }
        }

        return true;
    }
}
