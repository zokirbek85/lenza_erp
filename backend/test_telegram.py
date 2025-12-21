#!/usr/bin/env python
"""
Test Telegram Bot - send a simple test message
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from telegram_bot.services import send_telegram_message

print('=' * 60)
print('TELEGRAM BOT TEST')
print('=' * 60)

# Test 1: Simple text message
print('\n[Test 1] Sending simple text message...')
send_telegram_message('🧪 <b>Test Message</b>\n\nThis is a test message from Lenza ERP backend.')

print('\n' + '=' * 60)
print('Test completed!')
print('=' * 60)
print('\nIf you did not receive a message in your Telegram group, check:')
print('1. TELEGRAM_BOT_TOKEN is correct in .env file')
print('2. TELEGRAM_GROUP_CHAT_ID is correct in .env file')
print('3. Bot is added to the group and has permission to send messages')
print('4. Check console output above for any errors')
