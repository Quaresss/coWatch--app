# CoWatch

Совместный просмотр видео в реальном времени — приложение для синхронного просмотра YouTube, Rutube и VK Video с друзьями.

## Стек

| Технология | Применение |
|------------|------------|
| Vue 3 | UI-фреймворк |
| Vite | Сборка и dev-сервер |
| Pinia | State management |
| Vue Router | Маршрутизация |
| Tailwind CSS | Стили |
| Node.js | Серверная среда |
| Express | HTTP-сервер |
| Socket.io | Real-time коммуникация |


## Запуск

### 1. Сервер (отдельный терминал)

```bash
cd server
npm install
npm run dev
```

### 2. Клиент

```bash
npm install
npm run dev
```



## Использование

1. **Создать комнату** — Create Room → никнейм → Create Room
2. **Войти** — Join Room → код комнаты (6 символов) + никнейм
3. **Добавить видео** — Host/Controller вставляет ссылку в инпут в хедере (YouTube, Rutube, VK Video)
4. **Чат** — сообщения в правой панели
5. **Реакции** — эмодзи под видео
6. **Роли** — Host назначает Controller (управление) или Viewer (только просмотр)



