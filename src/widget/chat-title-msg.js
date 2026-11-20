import { h, Component } from 'preact';

export default class ChatTitleMsg extends Component {

    render({conf, unreadCount},{}) {
        return (
            <button type="button" aria-label="Открыть чат" style={{position: 'relative', cursor: 'pointer', border: 0, background: 'transparent', padding: 0}} onClick={this.props.onClick}>
                <div
                    className="desktop-closed-message"
                    style={{
                        background: conf.mainColor,
                        letterSpacing: '0',
                        color: '#fff',
                        display: 'block',
                        position: 'absolute',
                        fontSize: '14px',
                        lineHeight: '1.45',
                        top: 0,
                        right: '130px',
                        marginTop: '23px',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        maxWidth: '260px',
                        textAlign: 'left',
                        boxShadow: '0 12px 30px rgba(20,32,56,.18)',
                    }}
                >
                    {conf.introMessage}
                    <div
                        style={{
                            width: 0,
                            height: 0,
                            position: 'absolute',
                            top: '16px',
                            right: '-9px',
                            borderTop: '9px solid transparent',
                            borderBottom: '9px solid transparent',
                            borderLeft: '9px solid '+conf.mainColor
                        }}
                    />
                </div>
                <div
                    className="desktop-closed-message-avatar"
                    style={{
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'absolute',
                        top: '10px',
                        right: '40px',
                        height: '60px',
                        width: '60px',
                        borderRadius: '999px',
                        boxShadow: '0 12px 30px rgba(20,32,56,.18)',
                        border: '2px solid '+conf.mainColor,
                        overflow: 'visible'
                    }}
                >
                    {(conf.closedChatAvatarUrl === '') ?
                        <svg width="28" height="28" viewBox="0 0 24 24" fill={conf.mainColor} aria-hidden="true">
                            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-9 9c0-4.4 4-7 9-7s9 2.6 9 7v1H3v-1Z"/>
                        </svg>
                        :
                        <img
                            src={conf.closedChatAvatarUrl}
                            alt=""
                            style={{width:'100%', height:'100%', borderRadius:'999px', objectFit:'cover'}}
                        />
                    }
                    {unreadCount > 0 ? <span
                        style={{
                            background: '#e53935',
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            padding: '0 5px',
                            position: 'absolute',
                            right: '-6px',
                            bottom: '-6px',
                            textAlign: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '11px',
                            lineHeight: '20px',
                            boxShadow: '0 2px 8px rgba(0,0,0,.22)'
                        }}
                        aria-hidden="true"
                    >{unreadCount > 99 ? '99+' : unreadCount}</span> : ''}
                </div>
            </button>
        );
    }
}
