from decimal import Decimal, InvalidOperation

from asgiref.sync import sync_to_async
from django.db.models import Count
from django.utils import timezone
from telegram import Update
from telegram.ext import ContextTypes

from catalog.models import Product
from core.config import get_config_value
from dealers.models import Dealer
from orders.models import Order
from .utils import resolve_user_from_update


def _format_qty(value) -> str:
    try:
        return f"{Decimal(value):.2f}"
    except (InvalidOperation, TypeError, ValueError):
        return "0.00"

def _low_stock_threshold():
    return int(get_config_value('LOW_STOCK_THRESHOLD') or 5)


async def _get_user(update: Update):
    tg_user = update.effective_user
    if not tg_user:
        return None
    return await sync_to_async(resolve_user_from_update)(tg_user)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = await _get_user(update)
    if not update.message:
        return
    if not user:
        await update.message.reply_text('Sizning Telegram akkauntingiz ERP foydalanuvchisi bilan bog\'lanmagan.')
        return
    role_display = user.get_role_display()
    await update.message.reply_text(f"Salom, {user.get_full_name() or user.username}! Sizning rolingiz: {role_display}.")


async def stock_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = await _get_user(update)
    if not update.message:
        return
    if not user:
        await update.message.reply_text('Akkaunt bog\'lanmagan.')
        return
    threshold = _low_stock_threshold()
    products = await sync_to_async(list)(
        Product.objects.filter(stock_ok__lt=threshold)
        .values_list('name', 'stock_ok', 'sku')[:20]
    )
    if not products:
        await update.message.reply_text('Barcha mahsulotlar zaxirasi yetarli.')
        return
    lines = ['Kam zaxiradagi mahsulotlar:']
    for name, qty, sku in products:
        lines.append(f"{name} ({sku}) — {_format_qty(qty)} dona")
    await update.message.reply_text('\n'.join(lines))


async def dealer_balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = await _get_user(update)
    if not update.message:
        return
    if not user:
        await update.message.reply_text('Akkaunt bog\'lanmagan.')
        return
    query = ' '.join(context.args) if context.args else ''
    if not query:
        await update.message.reply_text('Iltimos, diler nomini kiriting. Misol: /dealer_balance Mega Door')
        return
    dealer = await sync_to_async(lambda: Dealer.objects.filter(name__icontains=query).first())()
    if not dealer:
        await update.message.reply_text('Diler topilmadi.')
        return
    balance = dealer.balance_usd
    await update.message.reply_text(f"{dealer.name} balansi: {balance:.2f} USD")


async def today_orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = await _get_user(update)
    if not update.message:
        return
    if not user:
        await update.message.reply_text('Akkaunt bog\'lanmagan.')
        return
    today = timezone.now().date()
    stats = await sync_to_async(list)(
        Order.objects.filter(created_at__date=today, is_imported=False)
        .values('status')
        .annotate(total=Count('id'))
    )
    if not stats:
        await update.message.reply_text('Bugun buyurtmalar yo\'q.')
        return
    lines = ['Bugungi buyurtmalar:']
    total = 0
    for row in stats:
        lines.append(f"{row['status']}: {row['total']}")
        total += row['total']
    lines.append(f"Jami: {total}")
    await update.message.reply_text('\n'.join(lines))
