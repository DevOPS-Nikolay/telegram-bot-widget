import { h, Component } from 'preact';

export default class ChatFrame extends Component {

    shouldComponentUpdate() {
        // Do not re-render the iframe and reinitialize the chat session.
        return false;
    }

    render({host, iFrameSrc, isMobile, conf},{}) {
        let dynamicConf = window.intergramOnOpen || {};
        let encodedConf = encodeURIComponent(JSON.stringify({...conf, ...dynamicConf}));
        return (
            <iframe src={iFrameSrc + '?host=' + host + '&conf=' + encodedConf }
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="Онлайн-чат"
                    allow="camera 'none'; microphone 'none'"
                    style={{display: 'block', width: '100%', height: '100%', border: 0}}>
            </iframe>
        );
    }
}
