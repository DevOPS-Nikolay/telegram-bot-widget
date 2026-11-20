import { h, render } from 'preact';
import Widget from './widget';
import {defaultConfiguration} from './default-configuration';

if (window.attachEvent) {
    window.attachEvent('onload', injectChat);
} else {
    window.addEventListener('load', injectChat, false);
}

function injectChat() {
    const currentScript = document.currentScript || document.querySelector('script[id="intergram"]');
    let resolvedServer = window.intergramServer;

    if (!resolvedServer && currentScript && currentScript.src) {
        try {
            const scriptUrl = new URL(currentScript.src);
            const scriptPath = scriptUrl.pathname || '';
            const widgetPath = scriptPath.replace(/\/js\/widget\.js(?:$|[?#])/, '/');
            const basePath = widgetPath.replace(/\/$/, '').replace(/\/js\/widget\.js$/, '');
            resolvedServer = scriptUrl.origin + (basePath === '/' ? '' : basePath);
        } catch (e) {
            console.warn('Failed to resolve Intergram server from widget script URL.', e);
        }
    }

    if (!resolvedServer) {
        resolvedServer = window.location.origin;
    }

    const server = resolvedServer.replace(/\/$/, '');
    const host = window.location.host || 'unknown-host';
    const conf = { ...defaultConfiguration, ...window.intergramCustomizations };
    const mountWidget = (chatId) => {
        let root = document.createElement('div');
        root.id = 'intergramRoot';
        document.getElementsByTagName('body')[0].appendChild(root);

        render(
            <Widget intergramId={chatId}
                    host={host}
                    iFrameSrc={server + '/chat.html'}
                    conf={conf}
            />,
            root
        );

        try {
            const request = new XMLHttpRequest();
            request.open('POST', server + '/usage-start?host=' + host);
            request.send();
        } catch (e) { /* Fail silently */ }
    };

    const request = new XMLHttpRequest();
    request.open('GET', server + '/config');
    request.setRequestHeader('Accept', 'application/json');
    request.onreadystatechange = function() {
        if (request.readyState !== 4) {
            return;
        }

        if (request.status >= 200 && request.status < 300) {
            try {
                const payload = JSON.parse(request.responseText);
                if (payload && payload.chatId) {
                    mountWidget(payload.chatId);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse Intergram config', e);
            }
        }

        console.error('Intergram backend config is missing. Set INTERGRAM_CHAT_ID on the server and keep the chat ID out of the website markup.');
    };
    request.send();
}
