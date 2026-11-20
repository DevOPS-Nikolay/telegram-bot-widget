Проект создан на основе [Intergram](https://github.com/idoco/intergram) и доработан с целью улучшения пользовательского интерфейса, функциональности и удобства использования

# Чат-виджет для Telegram

Минималистичный виджет обратной связи для сайта с доставкой сообщений и изображений в Telegram. Backend и интерфейс виджета входят в один Node.js-проект.

## Возможности

- Текстовый чат между посетителем и оператором
- Отправка изображений из виджета в Telegram
- Получение текстовых и фотосообщений от администратора
- Ответы на конкретного пользователя через Telegram Reply
- Очередь недоставленных сообщений для посетителя на 24 часа
- Автоматическое удаление временных файлов через 24 часа
- Сжатие изображений и создание миниатюр
- Адаптивный интерфейс для телефона и компьютера
- Изменяемые размеры чат-окна на компьютере
- Настраиваемые текст и цвет виджета
- Docker и Docker Compose для развёртывания

Секция старого сервиса, база данных и Telegram chat ID в клиентском коде из исходного проекта не используются.

## Требования

- Node.js 20 и новее
- Telegram-бот, созданный через `@BotFather`
- Токен бота `TELEGRAM_TOKEN`
- ID Telegram-чата администратора `INTERGRAM_CHAT_ID`
- Доступный извне HTTPS-домен для Telegram webhook

## Быстрый запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте файл `.env` в корне проекта:

```env
TELEGRAM_TOKEN=1234567890:telegram_bot_token
INTERGRAM_CHAT_ID=123456789
PORT=3000
CERTBOT_RESPONSE=
```

`INTERGRAM_CHAT_ID` — это числовой ID личного или группового чата Telegram, куда будут приходить сообщения. Указывать этот ID в HTML или JavaScript клиентской страницы не нужно.

3. Соберите статические файлы виджета:

```bash
npm run build
```

4. Запустите сервер:

```bash
npm start
```

После запуска демонстрационная страница будет доступна по адресу:

```text
http://localhost:3000/
```

Для разработки сервер сборки можно запустить отдельно:

```bash
npm run dev
```

## Настройка Telegram webhook

После развёртывания укажите Telegram адрес обработчика:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ваш-домен.example/hook
```

Замените `<TOKEN>` на реальный токен бота и `https://ваш-домен.example` на публичный HTTPS-адрес вашего сервера.

Проверить текущее подключение webhook можно так:

```text
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## Установка виджета на сайт

Вставьте код перед закрывающим тегом `</body>`:

```html
<script>
  window.intergramServer = 'https://ваш-сервер.example';
  window.intergramCustomizations = {
    titleClosed: 'Чат поддержки',
    titleOpen: 'Чат с техподдержкой',
    introMessage: 'Привет! Чем можем помочь?',
    autoResponse: 'Сообщение доставлено. Ответим в ближайшее время.',
    autoNoResponse: 'Сейчас мы офлайн. Оставьте вопрос — ответим позже.',
    placeholderText: 'Напишите сообщение…',
    mainColor: '#1f8ceb',
    closedStyle: 'button',
    desktopWidth: 370,
    desktopHeight: 450
  };
</script>
<script id="intergram" src="https://ваш-сервер.example/js/widget.js"></script>
```

Если виджет размещён на том же сервере, достаточно указать адрес страницы так:

```html
<script>
  window.intergramServer = window.location.origin;
</script>
<script id="intergram" src="/js/widget.js"></script>
```

Сервер ID чата читает только из переменной `INTERGRAM_CHAT_ID` окружения и отдаёт виджету не секретные настройки через `/config`.

## Настройка внешнего вида

Все параметры необязательны. Не указанные значения берутся из конфигурации проекта:

```html
<script>
  window.intergramCustomizations = {
    titleClosed: '',
    titleOpen: 'Чат с техподдержкой',
    closedStyle: 'button',
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
</script>
```

### Основные параметры

- `titleClosed` — заголовок свернутого чата
- `titleOpen` — заголовок открытого чата
- `closedStyle` — режим свернутого вида: `button` или `chat`
- `introMessage` — первое сообщение в окне чата
- `autoResponse` — ответ сразу после первого сообщения посетителя
- `autoNoResponse` — ответ, если оператор не ответил вовремя
- `placeholderText` — текст подсказки поля ввода
- `displayMessageTime` — показывать ли время сообщений
- `mainColor` — основной цвет виджета
- `alwaysUseFloatingButton` — всегда использовать плавающую кнопку вместо заголовка
- `desktopWidth` и `desktopHeight` — размеры окна на компьютере
- `resizable` — разрешить ручное изменение размера окна

Параметры задаются до загрузки `widget.js`.

## Ответы оператору из Telegram

1. Получите новое сообщение в настроенном чате Telegram.
2. Нажмите **Ответить** на конкретное входящее сообщение пользователя.
3. Введите ответ и отправьте его.

Виджет направит текст только тому посетителю, чей ID указан в начале исходного сообщения.

Сообщение без ответа на конкретное сообщение передаётся всем активным соединениям чата. Нужное поведение зависит от количества одновременно работающих операторов и посетителей.

## Изображения

Поддерживаются JPEG, PNG и WebP до 10 МБ.

- Посетитель загружает изображение через виджет
- Изображение отправляется в Telegram и сохраняется во временной папке сервера
- Администратор получает изображение и отвечает в Telegram обычным текстом или фотографией
- Администраторское изображение сохраняется во временной папке и передаётся посетителю с миниатюрой
- Файлы старше 24 часов удаляются фоновым процессом очистки

## Публичные и внутренние маршруты

- `GET /` — демонстрационная страница
- `GET /chat.html` — интерфейс внутреннего iframe чата
- `GET /config` — публикует настроенный chat ID виджету
- `POST /hook` — принимает webhook от Telegram
- `POST /api/send-photo` — принимает изображение посетителя
- `GET /files/:filename` — отдаёт временное изображение
- `POST /usage-start` — служебная отметка активации виджета

Секретный Telegram-токен передаётся только на сервере и не попадает в HTML или JavaScript виджета.

## Docker

### Через Docker Compose

Сначала создайте файл `.env` в корне проекта:

```env
TELEGRAM_TOKEN=1234567890:telegram_bot_token
INTERGRAM_CHAT_ID=123456789
PORT=3000
```

Затем выполните:

```bash
docker compose up --build
```

Приложение будет доступно на порту `3000`.

### Через Docker вручную

```bash
docker build -t intergram-widget .
docker run --rm -p 3000:3000 --env-file .env intergram-widget
```

## Проверка проекта

Запустить проверки:

```bash
npm test
```

Собрать production-файлы:

```bash
npm run build
```

Результат сборки находится в папке `dist`:

```text
dist/
  demo.html
  chat.html
  css/
  media/
  js/widget.js
  js/chat.js
```

## Структура проекта

```text
src/widget/  — интерфейс виджета
src/chat/    — интерфейс окна чата
css/         — стили чата
server.js    — Express, Socket.IO и Telegram API
webpack.config.js — сборка JavaScript
media/       — звуки и медиафайлы
dist/        — собранная production-версия
```

## Безопасность

- Не публикуйте `TELEGRAM_TOKEN` в браузерном коде
- Не добавляйте `TELEGRAM_TOKEN` в репозиторий
- Ограничьте размер загружаемых изображений на прокси при необходимости
- Используйте HTTPS и валидируйте webhook-запросы с помощью firewall или reverse proxy в production
- Добавляйте переменные окружения через секреты хостинг-системы вместо файла `.env`, если он попадает в образ контейнера
