export const defaultConfiguration = {
    titleClosed: '',
    titleOpen: 'Чат с техподдержкой',
    closedStyle: 'button', // button or chat
    closedChatAvatarUrl: '', // only used if closedStyle is set to 'chat'
    cookieExpiration: 1, // in days. Once opened, closed chat title will be shown as button (when closedStyle is set to 'chat')
    introMessage: 'Привет, если есть вопросы, напиши мне.',
    autoResponse: 'Сообщение доставлено. Постараюсь ответить в ближайшее время.',
    autoNoResponse: 'Сейчас не могу ответить, отвечу позже.',
    placeholderText: 'Напишите сообщение…',
    displayMessageTime: true,
    mainColor: '#1f8ceb',
    alwaysUseFloatingButton: false,
    desktopHeight: 450,
    desktopWidth: 370,
    resizable: true
};
