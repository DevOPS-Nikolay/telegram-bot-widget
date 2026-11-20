import { h, render } from 'preact';
import Chat from './chat';
import * as store from 'store'

let conf = {};
const confString = getUrlParameter('conf');
if (confString) {
    try {
        conf = JSON.parse(confString);
    } catch (e) {
        console.log('Failed to parse conf', confString, e);
    }
}

const renderChat = (chatId) => {
    render(
        <Chat
            chatId={chatId}
            userId={getUserId()}
            host={getUrlParameter('host')}
            conf={conf}
        />,
        document.getElementById('intergramChat')
    );
};

const existingChatId = getUrlParameter('id');
if (existingChatId) {
    renderChat(existingChatId);
} else {
    const request = new XMLHttpRequest();
    const chatPagePath = window.location.pathname || '';
    const chatBasePath = chatPagePath.replace(/\/chat\.html$/, '').replace(/\/$/, '');
    const configUrl = window.location.origin + (chatBasePath || '') + '/config';
    request.open('GET', configUrl);
    request.setRequestHeader('Accept', 'application/json');
    request.onreadystatechange = function() {
        if (request.readyState !== 4) {
            return;
        }

        if (request.status >= 200 && request.status < 300) {
            try {
                const payload = JSON.parse(request.responseText);
                if (payload && payload.chatId) {
                    renderChat(payload.chatId);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse Intergram chat config', e);
            }
        }

        console.error('Unable to load the backend chat configuration.');
    };
    request.send();
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    let results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function getUserId () {
    if (store.enabled) {
        return store.get('userId') || store.set('userId', generateRandomId());
    } else {
        return generateRandomId();
    }
}

function generateRandomId() {
    return Math.random().toString(36).substr(2, 6);
}