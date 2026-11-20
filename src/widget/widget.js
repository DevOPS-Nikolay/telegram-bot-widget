import { h, Component } from 'preact';
import ChatFrame from './chat-frame';
import ChatFloatingButton from './chat-floating-button';
import ChatTitleMsg from './chat-title-msg';
import ArrowIcon from './arrow-icon';
import {
    desktopTitleStyle,
    desktopWrapperStyle,
    mobileOpenWrapperStyle,
    mobileClosedWrapperStyle,
    desktopClosedWrapperStyleChat
} from "./style";

export default class Widget extends Component {

    constructor(props) {
        super(props);
        this.mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 700px), (pointer: coarse)') : null;
        this.sizeStorageKey = 'intergram-widget-size.' + (props.host || 'unknown-host');
        const savedSize = this.loadSavedSize();
        this.state = {
            isChatOpen: false,
            pristine: true,
            wasChatOpened: this.wasChatOpened(),
            unreadCount: 0,
            isMobile: this.mobileQuery ? this.mobileQuery.matches : false,
            manualWidth: savedSize.width,
            manualHeight: savedSize.height,
            isResizing: false
        };
        this.seenUnreadKeys = {};
        this.resizeSnapshot = null;
    }

    componentDidMount() {
        window.addEventListener('message', this.handleWindowMessage);
        window.addEventListener('keydown', this.handleKeyDown);
        if (this.mobileQuery) {
            this.mobileQuery.addListener ? this.mobileQuery.addListener(this.handleMobileChange) : null;
        }

        if (!document.getElementById('intergram-widget-motion')) {
            const style = document.createElement('style');
            style.id = 'intergram-widget-motion';
            style.textContent = '\n' +
                '#intergramRoot { font-family: Inter, Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }\n' +
                '#intergramRoot button, #intergramRoot [role="button"] { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }\n' +
                '#intergramRoot button:focus-visible { outline: 3px solid rgba(31,140,235,.32); outline-offset: 3px; }\n' +
                '#intergramRoot .intergram-floating-button { transition: transform 120ms cubic-bezier(0.23,1,0.32,1), box-shadow 120ms ease; }\n' +
                '#intergramRoot .intergram-floating-button:active { transform: scale(.94); }\n' +
                '#intergramRoot .intergram-resize-handle:focus-visible { outline: 3px solid rgba(31,140,235,.32); outline-offset: 2px; }\n' +
                '#intergramRoot .intergram-resize-handle:active { background: rgba(31,140,235,.08); }\n' +
                '#intergramRoot .intergram-chat-viewport { animation: intergram-chat-enter 180ms cubic-bezier(0.23,1,0.32,1) both; transform-origin: bottom right; }\n' +
                '#intergramRoot .desktop-closed-message { animation: intergram-teaser-enter 220ms cubic-bezier(0.23,1,0.32,1) both; transform-origin: right 20px; }\n' +
                '@keyframes intergram-chat-enter { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }\n' +
                '@keyframes intergram-teaser-enter { from { opacity: 0; transform: translateX(8px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }\n' +
                '@media (hover:hover) and (pointer:fine) { #intergramRoot .intergram-floating-button:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(20,32,56,.28); } }\n' +
                '@media (prefers-reduced-motion: reduce) { #intergramRoot * { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }';
            document.head.appendChild(style);
        }
    }

    componentWillUnmount() {
        window.removeEventListener('message', this.handleWindowMessage);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('pointermove', this.onResizeMove);
        window.removeEventListener('pointerup', this.finishResize);
        window.removeEventListener('pointercancel', this.cancelResize);
        if (this.mobileQuery && this.mobileQuery.removeListener) {
            this.mobileQuery.removeListener(this.handleMobileChange);
        }
    }

    handleMobileChange = (event) => {
        this.setState({isMobile: event.matches});
    };

    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            if (this.state.isResizing) {
                this.cancelResize();
            } else if (this.state.isChatOpen) {
                this.onClick();
            }
        } else {
            this.handleResizeKey(event);
        }
    };

    handleWindowMessage = (event) => {
        if (!event.data || event.data.type !== 'intergram-admin-message') return;

        const payload = event.data.payload || {};
        const key = payload.id ? 'id:' + payload.id : 'text:' + (payload.from || '') + ':' + (payload.text || payload.imageUrl || '') + ':' + (payload.ts || '');
        if (this.seenUnreadKeys[key]) return;
        this.seenUnreadKeys[key] = true;

        if (!this.state.isChatOpen) {
            this.setState({unreadCount: this.state.unreadCount + 1});
        }
    };

    render({conf}, {isChatOpen, pristine, unreadCount, isMobile, manualWidth, manualHeight, isResizing}) {

        const defaultDesktopHeight = Math.max(360, Math.min(Number(conf.desktopHeight) || 450, window.innerHeight - 110));
        const desktopHeight = manualHeight ? Math.min(Math.max(360, manualHeight), Math.max(360, window.innerHeight - 110)) : defaultDesktopHeight;
        const defaultDesktopWidth = Math.min(Number(conf.desktopWidth) || 370, Math.max(300, window.innerWidth - 40));
        const desktopWidth = manualWidth ? Math.min(Math.max(300, manualWidth), Math.max(300, window.innerWidth - 40)) : defaultDesktopWidth;
        const wrapperWidth = {width: desktopWidth};
        const wrapperHeight = {height: desktopHeight};

        let wrapperStyle;
        if (!isChatOpen && (isMobile || conf.alwaysUseFloatingButton || conf.closedStyle === 'button')) {
            wrapperStyle = mobileClosedWrapperStyle;
        } else if (!isMobile) {
            wrapperStyle = (conf.closedStyle === 'chat' || isChatOpen || this.state.wasChatOpened) ?
                (isChatOpen ? {...desktopWrapperStyle, ...wrapperWidth, ...wrapperHeight} : {...desktopWrapperStyle}) :
                desktopClosedWrapperStyleChat;
        } else {
            wrapperStyle = mobileOpenWrapperStyle;
        }

        return (
            <div style={wrapperStyle} role="region" aria-label="Чат поддержки">

                {(isMobile || conf.alwaysUseFloatingButton || conf.closedStyle === 'button') && !isChatOpen ?
                    <ChatFloatingButton color={conf.mainColor} onClick={this.onClick} unreadCount={unreadCount} isChatOpen={false}/>
                    :
                    (conf.closedStyle === 'chat' || isChatOpen || this.state.wasChatOpened) ?
                        <button type="button"
                                aria-expanded={isChatOpen ? 'true' : 'false'}
                                aria-label={isChatOpen ? 'Свернуть чат' : 'Открыть чат'}
                                style={{...desktopTitleStyle, width: '100%', border: 0, background: conf.mainColor}}
                                onClick={this.onClick}>
                            <span style={{display: 'flex', alignItems: 'center'}}>{isChatOpen ? conf.titleOpen : conf.titleClosed}</span>
                            <ArrowIcon isOpened={isChatOpen}/>
                        </button>
                        :
                        <ChatTitleMsg onClick={this.onClick} conf={conf} unreadCount={unreadCount}/>
                }

                <div className="intergram-chat-viewport" style={{
                    display: isChatOpen ? 'block' : 'none',
                    height: isMobile ? 'calc(100dvh - 52px)' : (desktopHeight - 52) + 'px',
                    width: '100%',
                    background: '#fff',
                    overflow: 'hidden'
                }}>
                    {pristine ? null : <ChatFrame {...this.props} isMobile={isMobile} />}
                </div>

                {!isMobile && !pristine && isChatOpen && conf.resizable !== false ?
                    <div
                        role="button"
                        tabIndex="0"
                        aria-label="Изменить размер чата. Стрелки меняют размер, клавиша Home сбрасывает размер"
                        className="intergram-resize-handle"
                        style={{
                            position: 'absolute',
                            left: '3px',
                            top: '3px',
                            width: '24px',
                            height: '24px',
                            cursor: 'nwse-resize',
                            touchAction: 'none',
                            zIndex: 10,
                            borderRadius: '10px 0 6px 0',
                            background: 'transparent',
                            opacity: 0
                        }}
                        onPointerDown={this.startResize}
                        onKeyDown={this.handleResizeKey}
                        onDoubleClick={this.resetSize}
                    >
                    </div>
                    :
                    null
                }

            </div>
        );
    }

    onClick = () => {
        const willOpen = !this.state.isChatOpen;
        let stateData = {pristine: false, isChatOpen: willOpen};

        if (willOpen) {
            stateData.unreadCount = 0;
        }

        if (!this.state.isChatOpen && !this.state.wasChatOpened) {
            this.setCookie();
            stateData.wasChatOpened = true;
        }
        this.setState(stateData);
    }

    setCookie = () => {
        let date = new Date();
        let expirationTime = parseInt(this.props.conf.cookieExpiration);
        date.setTime(date.getTime()+((expirationTime || 1)*24*60*60*1000));
        document.cookie = "chatwasopened=1; expires="+date.toGMTString()+"; path=/";
    }

    getCookie = () => {
        var nameEQ = "chatwasopened=";
        var ca = document.cookie.split(';');
        for(var i=0;i<ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return false;
    }

    wasChatOpened = () => this.getCookie() !== false;

    loadSavedSize = () => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(this.sizeStorageKey) || 'null');
            return {
                width: saved && Number(saved.width) ? Number(saved.width) : null,
                height: saved && Number(saved.height) ? Number(saved.height) : null
            };
        } catch (e) {
            return {width: null, height: null};
        }
    };

    saveSize = () => {
        try {
            window.localStorage.setItem(this.sizeStorageKey, JSON.stringify({
                width: this.state.manualWidth,
                height: this.state.manualHeight
            }));
        } catch (e) {}
    };

    startResize = (event) => {
        if (this.state.isMobile) return;
        event.preventDefault();
        event.stopPropagation();

        const wrapper = event.currentTarget.parentNode;
        const wrapperRect = wrapper.getBoundingClientRect ? wrapper.getBoundingClientRect() : null;
        if (!wrapperRect) return;

        this.resizeSnapshot = {
            width: wrapperRect.width,
            height: wrapperRect.height,
            manualWidth: this.state.manualWidth,
            manualHeight: this.state.manualHeight,
            clientX: event.clientX,
            clientY: event.clientY
        };

        this.setState({isResizing: true});
        if (event.currentTarget.setPointerCapture && event.pointerId !== undefined) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        window.addEventListener('pointermove', this.onResizeMove);
        window.addEventListener('pointerup', this.finishResize);
        window.addEventListener('pointercancel', this.cancelResize);
    };

    onResizeMove = (event) => {
        if (!this.resizeSnapshot) return;

        const maxWidth = Math.max(300, window.innerWidth - 40);
        const maxHeight = Math.max(360, window.innerHeight - 110);
        const deltaX = this.resizeSnapshot.clientX - event.clientX;
        const deltaY = this.resizeSnapshot.clientY - event.clientY;
        const nextWidth = Math.min(maxWidth, Math.max(300, this.resizeSnapshot.width + deltaX));
        const nextHeight = Math.min(maxHeight, Math.max(360, this.resizeSnapshot.height + deltaY));

        this.setState({manualWidth: Math.round(nextWidth), manualHeight: Math.round(nextHeight)});
    };

    finishResize = () => {
        window.removeEventListener('pointermove', this.onResizeMove);
        window.removeEventListener('pointerup', this.finishResize);
        window.removeEventListener('pointercancel', this.cancelResize);
        this.resizeSnapshot = null;
        this.setState({isResizing: false}, this.saveSize);
    };

    cancelResize = () => {
        window.removeEventListener('pointermove', this.onResizeMove);
        window.removeEventListener('pointerup', this.finishResize);
        window.removeEventListener('pointercancel', this.cancelResize);
        if (this.resizeSnapshot) {
            this.setState({
                manualWidth: this.resizeSnapshot.manualWidth,
                manualHeight: this.resizeSnapshot.manualHeight,
                isResizing: false
            });
        } else {
            this.setState({isResizing: false});
        }
        this.resizeSnapshot = null;
    };

    handleResizeKey = (event) => {
        if (this.state.isMobile || !this.state.isChatOpen) return;
        const step = event.shiftKey ? 40 : 10;
        let width = this.state.manualWidth || Math.min(Number(this.props.conf.desktopWidth) || 370, Math.max(300, window.innerWidth - 40));
        let height = this.state.manualHeight || Math.min(Number(this.props.conf.desktopHeight) || 450, window.innerHeight - 110);

        if (event.key === 'ArrowLeft') width -= step;
        else if (event.key === 'ArrowRight') width += step;
        else if (event.key === 'ArrowUp') height += step;
        else if (event.key === 'ArrowDown') height -= step;
        else if (event.key === 'Home') {
            event.preventDefault();
            this.resetSize();
            return;
        } else return;

        event.preventDefault();
        const maxWidth = Math.max(300, window.innerWidth - 40);
        const maxHeight = Math.max(360, window.innerHeight - 110);
        this.setState({
            manualWidth: Math.min(maxWidth, Math.max(300, Math.round(width))),
            manualHeight: Math.min(maxHeight, Math.max(360, Math.round(height)))
        }, this.saveSize);
    };

    resetSize = () => {
        this.setState({manualWidth: null, manualHeight: null}, () => {
            try { window.localStorage.removeItem(this.sizeStorageKey); } catch (e) {}
        });
    };
}
