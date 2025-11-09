# Telegram Bot Integration

Lenza ERP ships with a lightweight Telegram bot that can be used to interact with the platform and receive simple updates. This document explains how to configure, run, and extend the bot.

---

## 1. Prerequisites

1. **Python dependencies**  
   Make sure backend dependencies are installed (from the project root):
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
   This installs `python-telegram-bot==21.4`, which is required for the bot.

2. **Telegram Bot Token**  
   Create a bot via [@BotFather](https://t.me/BotFather) and copy the generated token.  
   Add it to your environment (e.g. `.env`):
   ```ini
   TELEGRAM_BOT_TOKEN=1234567890:ABCDEF......
   ```
   The Django settings read this value (`TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")`), so make sure the var is present whenever the bot runs.

---

## 2. Folder Structure

```
backend/telegram_bot/
├── __init__.py
├── bot.py                # Application factory (loads handlers, builds telegram.ext.Application)
├── handlers/
│   └── start.py          # /start command definition
├── management/
│   └── commands/
│       └── runbot.py     # Django management command entrypoint
└── settings.py           # Thin wrapper that exposes BOT_TOKEN (read from Django settings)
```

---

## 3. Running the Bot (Polling mode)

1. Activate your virtualenv (or ensure the correct Python interpreter is in use).
2. From `backend/`, execute:
   ```bash
   python manage.py runbot
   ```
3. You should see:
   ```
   🤖 Telegram bot started...
   ```
   The process stays attached, polling Telegram’s API.

> **Tip:** For production environments you can wrap this command in a process manager (systemd, supervisor, etc.) or adapt the `create_bot()` function to run via webhooks instead of polling.

---

## 4. Verifying the Bot

1. Open Telegram and search for your bot by the username you configured via BotFather.
2. Send `/start`.
3. The bot should respond with:
   ```
   Salom, <your name>! 👋
   Siz Lenza ERP Telegram yordamchisiga ulandingiz.
   ```

If you do not get a reply:
- Double‑check `TELEGRAM_BOT_TOKEN`.
- Ensure the process running `python manage.py runbot` is still active.
- Reinstall dependencies (`pip install -r requirements.txt`) to ensure `python-telegram-bot` is available.

---

## 5. Extending the Bot

- **Add new commands**: Create a new file under `backend/telegram_bot/handlers/`, define an async handler, and register it in `bot.py`.
- **Broadcast messages**: Build helper functions under `telegram_bot/services.py` (or a similar module) that call the Telegram HTTP API, then trigger them from Django signals (orders, payments, etc.).
- **Webhooks**: For deployment environments where long-running polling is not desired, adapt `create_bot()` to call `app.run_webhook(...)` and configure a public URL reachable by Telegram.

---

The bot layer is intentionally thin so it can evolve alongside the ERP backend—feel free to add richer handlers, authentication checks, or notification hooks as your workflow grows. Have fun! 🚀
