"""
Image processing service for product images.

Handles:
- Image resizing (max 1200px, maintain aspect ratio)
- WebP conversion with compression (200-300 KB target)
- Background removal using rembg
- Edge refinement and optimization
"""
import io
from pathlib import Path
from typing import BinaryIO

from PIL import Image


class ImageProcessingError(Exception):
    """Raised when image processing fails."""
    pass


def process_product_image(
    image_file: BinaryIO,
    max_size: int = 1200,
    quality: int = 85,
    remove_bg: bool = True,
) -> bytes:
    """
    Process a product image: resize, compress, and optionally remove background.

    Args:
        image_file: File-like object containing the image
        max_size: Maximum dimension (width or height) in pixels
        quality: WebP quality (1-100, higher = better quality)
        remove_bg: Whether to remove the background

    Returns:
        Processed image as WebP bytes

    Raises:
        ImageProcessingError: If processing fails
    """
    try:
        # Read and validate image
        img = Image.open(image_file)
        
        # Convert RGBA to RGB if needed (for non-transparent source images)
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA')
        
        # Resize to max dimension while maintaining aspect ratio
        img = _resize_image(img, max_size)
        
        # Remove background if requested
        if remove_bg:
            img = _remove_background(img)
        
        # Convert to WebP with compression
        output = io.BytesIO()
        
        # Save as WebP
        img.save(
            output,
            format='WEBP',
            quality=quality,
            method=6,  # slowest but best compression
            lossless=False,
        )
        
        processed_bytes = output.getvalue()
        
        # Check file size - if too large, reduce quality
        if len(processed_bytes) > 350_000:  # > 350 KB
            output = io.BytesIO()
            img.save(
                output,
                format='WEBP',
                quality=max(50, quality - 15),
                method=6,
                lossless=False,
            )
            processed_bytes = output.getvalue()
        
        return processed_bytes
    
    except Exception as e:
        raise ImageProcessingError(f"Failed to process image: {str(e)}") from e


def _resize_image(img: Image.Image, max_size: int) -> Image.Image:
    """
    Resize image to fit within max_size while maintaining aspect ratio.

    Args:
        img: PIL Image object
        max_size: Maximum dimension (width or height)

    Returns:
        Resized PIL Image
    """
    width, height = img.size
    
    # Skip if already smaller
    if width <= max_size and height <= max_size:
        return img
    
    # Calculate new dimensions
    if width > height:
        new_width = max_size
        new_height = int((height / width) * max_size)
    else:
        new_height = max_size
        new_width = int((width / height) * max_size)
    
    # Use LANCZOS for high-quality downsampling
    return img.resize((new_width, new_height), Image.Resampling.LANCZOS)


def _remove_background(img: Image.Image) -> Image.Image:
    """
    Remove background from image using rembg.

    Args:
        img: PIL Image object

    Returns:
        PIL Image with transparent background
    """
    # Lazy import to avoid numba caching issues in Docker
    from rembg import remove
    
    # Convert to bytes for rembg
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Remove background
    output_bytes = remove(
        img_bytes.read(),
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    
    # Convert back to PIL Image
    return Image.open(io.BytesIO(output_bytes))


def delete_product_image(image_path: str) -> None:
    """
    Delete a product image file.

    Args:
        image_path: Relative path to the image (e.g., 'products/123/image.webp')
    """
    try:
        from django.conf import settings
        full_path = Path(settings.MEDIA_ROOT) / image_path
        if full_path.exists() and full_path.is_file():
            full_path.unlink()
            
            # Try to remove parent directory if empty
            parent = full_path.parent
            if parent.exists() and not any(parent.iterdir()):
                parent.rmdir()
    except Exception:
        # Silently fail - image deletion is not critical
        pass
