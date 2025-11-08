from django.contrib.auth import get_user_model

User = get_user_model()


def resolve_user_from_update(user_data):
    telegram_id = str(user_data.id)
    user = User.objects.filter(telegram_id=telegram_id).first()
    if user:
        return user
    username = user_data.username
    if username:
        user = User.objects.filter(username__iexact=username).first()
        if user:
            user.telegram_id = telegram_id
            user.save(update_fields=['telegram_id'])
            return user
    return None
