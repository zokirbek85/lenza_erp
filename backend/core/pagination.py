"""Custom pagination classes for DRF"""
from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that supports dynamic page size via query parameter.

    Usage:
    - Default page size: 25
    - Query parameter: ?page_size=50
    - Max page size: 200
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200
