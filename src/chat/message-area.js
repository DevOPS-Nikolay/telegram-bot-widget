import dateFormat from 'dateformat'
import { h, Component } from 'preact';

const dayInMillis = 60 * 60 * 24 * 1000;

export default class MessageArea extends Component {

    componentDidMount() {
        this.scrollToLatest(false);
    }

    componentDidUpdate() {
        this.scrollToLatest(true);
    }

    scrollToLatest = (smooth) => {
        if (!this.list) return;
        const method = smooth && this.list.scrollTo ? 'scrollTo' : 'scrollTop';
        if (method === 'scrollTo') {
            this.list.scrollTo({top: this.list.scrollHeight, behavior: 'smooth'});
        } else {
            this.list.scrollTop = this.list.scrollHeight;
        }
    };

    formatTime = (time) => {
        const date = time instanceof Date ? time : new Date(time);
        if (!time || isNaN(date.getTime())) return '';
        const currentTime = new Date();
        return currentTime - date < dayInMillis ? dateFormat(date, "HH:MM") : dateFormat(date, "m/d/yy HH:MM");
    };

    render(props,{}) {
        return (
            <ol class="chat" ref={(list) => { this.list = list }}>
                {props.messages.map((message, index) => {
                    const name = message.from === 'visitor' ? 'Вы' : message.name;
                    const isPhoto = message.type === 'photo';
                    const time = this.formatTime(message.time || message.ts);

                    if (isPhoto) {
                        const previewUrl = message.imageUrl || message.originalUrl;
                        const openUrl = message.originalUrl || message.imageUrl;
                        return (
                            <li class={'message-row ' + message.from} key={'photo-' + index}>
                                <article class="msg photo-msg">
                                    {openUrl ? (
                                        <a class="photo-link" href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Открыть фотографию в новом окне">
                                            <div class="photo-loading" aria-label="Загрузка фотографии"></div>
                                            <img class="chat-photo" src={previewUrl} alt={message.caption || 'Фотография'} onLoad={(event) => event.currentTarget.parentNode.classList.add('is-loaded')} onError={(event) => event.currentTarget.parentNode.classList.add('is-error')} />
                                        </a>
                                    ) : ''}
                                    {(message.caption) ? <p class="photo-caption">{name ? name + ': ' : ''}{message.caption}</p> : ''}
                                    {props.conf.displayMessageTime && time ? <time class="time" datetime={(message.time || message.ts) ? new Date(message.time || message.ts).toISOString() : ''}>{time}</time> : ''}
                                </article>
                            </li>
                        );
                    }

                    return (
                        <li class={'message-row ' + message.from} key={'text-' + index}>
                            <article class="msg">
                                <p>{name ? name + ': ' + (message.text || '') : (message.text || '')}</p>
                                {props.conf.displayMessageTime && time ? <time class="time" datetime={(message.time || message.ts) ? new Date(message.time || message.ts).toISOString() : ''}>{time}</time> : ''}
                            </article>
                        </li>
                    );
                })}
            </ol>
        );
    }

}
