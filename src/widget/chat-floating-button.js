import { h, Component } from 'preact';
import {mobileTitleStyle} from "./style";

export default class ChatFloatingButton extends Component {

    render({color, onClick, unreadCount, isChatOpen},{}) {
        const badge = unreadCount > 0 ? {
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            minWidth: '20px',
            height: '20px',
            borderRadius: '999px',
            background: '#e53935',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '20px',
            textAlign: 'center',
            padding: '0 5px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.22)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
        } : null;

        return (
            <div style={{position: 'relative', overflow: 'visible'}}>
                <button
                    type="button"
                    className="intergram-floating-button"
                    aria-label={unreadCount > 0 ? 'Открыть чат, непрочитанных сообщений: ' + unreadCount : 'Открыть чат'}
                    aria-expanded={isChatOpen ? 'true' : 'false'}
                    style={{background: color, ...mobileTitleStyle, position: 'relative', zIndex: 1}}
                    onClick={onClick}>

                    {isChatOpen ? (
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                            <path d="M5 5l14 14M19 5L5 19" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff" aria-hidden="true">
                            <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2 12H6v-2h12v2Zm0-4H6V8h12v2Z"/>
                        </svg>
                    )}
                </button>
                { unreadCount > 0 && <span style={badge} aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span> }
            </div>
        );
    }
}
