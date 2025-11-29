"""
Style detector utility for automatic style detection from product names.
"""
from typing import Optional

from catalog.models import Style


STYLE_RULES = {
    "лофт": "Loft",
    "loft": "Loft",
    "classic": "Klassika",
    "класс": "Klassika",
    "классика": "Klassika",
    "нео": "Neoklassika",
    "neo": "Neoklassika",
    "неоклассика": "Neoklassika",
    "modern": "Modern",
    "модерн": "Modern",
    "минимал": "Minimalizm",
    "minimal": "Minimalizm",
    "скандинав": "Skandinaviya",
    "scandi": "Skandinaviya",
    "прованс": "Provans",
    "provence": "Provans",
    "кантри": "Kantri",
    "country": "Kantri",
    "хай-тек": "Hi-Tech",
    "hi-tech": "Hi-Tech",
    "барокко": "Barokko",
    "baroque": "Barokko",
}


def detect_style(name: str) -> Optional[Style]:
    """
    Detect style from product name using keyword matching.
    
    Args:
        name: Product name to analyze
        
    Returns:
        Style instance if detected, None otherwise
        
    Example:
        >>> detect_style("Eshik Loft 800x2000")
        <Style: Loft>
        >>> detect_style("Klassika Premium Door")
        <Style: Klassika>
    """
    if not name:
        return None
    
    name_lower = name.lower()
    
    for keyword, style_name in STYLE_RULES.items():
        if keyword in name_lower:
            try:
                style = Style.objects.filter(name__iexact=style_name).first()
                if style:
                    return style
            except Style.DoesNotExist:
                continue
    
    return None


def auto_assign_style(product) -> bool:
    """
    Automatically assign style to product if not set.
    
    Args:
        product: Product instance
        
    Returns:
        True if style was assigned, False otherwise
    """
    if product.style:
        # Style already set, don't override
        return False
    
    detected_style = detect_style(product.name)
    if detected_style:
        product.style = detected_style
        product.save(update_fields=['style'])
        return True
    
    return False
