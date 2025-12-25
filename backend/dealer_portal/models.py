from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class DealerCart(models.Model):
    """
    Shopping cart for dealers to collect products before creating an order.
    Each dealer has one active cart at a time.
    """
    dealer = models.OneToOneField(
        'dealers.Dealer',
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name=_('Dealer'),
        help_text=_('Dealer who owns this cart')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Created at'),
        help_text=_('When the cart was created')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Updated at'),
        help_text=_('Last time cart was modified')
    )

    class Meta:
        verbose_name = _('Dealer Cart')
        verbose_name_plural = _('Dealer Carts')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Cart for {self.dealer.name}"

    def get_total_items(self):
        """Get total number of unique items in cart"""
        return self.items.count()

    def get_total_quantity(self):
        """Get total quantity of all items"""
        return sum(item.quantity for item in self.items.all())

    def clear(self):
        """Remove all items from cart"""
        self.items.all().delete()


class DealerCartItem(models.Model):
    """
    Individual item in a dealer's shopping cart.
    """
    cart = models.ForeignKey(
        DealerCart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Cart'),
        help_text=_('Cart this item belongs to')
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        verbose_name=_('Product'),
        help_text=_('Product in cart')
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_('Quantity'),
        help_text=_('Quantity to order (must be greater than 0)')
    )
    added_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Added at'),
        help_text=_('When item was added to cart')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Updated at'),
        help_text=_('Last time quantity was updated')
    )

    class Meta:
        verbose_name = _('Cart Item')
        verbose_name_plural = _('Cart Items')
        ordering = ['-added_at']
        unique_together = [['cart', 'product']]  # One product per cart

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    def get_subtotal(self):
        """Calculate subtotal for this item (quantity * price)"""
        return self.quantity * self.product.sell_price_usd
