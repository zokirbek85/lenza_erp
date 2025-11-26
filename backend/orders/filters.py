from django_filters import rest_framework as filters
from .models import Order


class OrderFilter(filters.FilterSet):
    """Custom filter for Order model with advanced filtering options."""
    
    # Date range filters
    value_date_from = filters.DateFilter(field_name='value_date', lookup_expr='gte')
    value_date_to = filters.DateFilter(field_name='value_date', lookup_expr='lte')
    created_at_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Manager/creator filter
    created_by = filters.NumberFilter(field_name='created_by__id')
    
    class Meta:
        model = Order
        fields = ['status', 'dealer', 'is_reserve', 'created_by']
