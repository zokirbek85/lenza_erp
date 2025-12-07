"""
Standardized Excel export utilities for Lenza ERP.

This module provides a clean, reusable approach for XLSX file generation
with proper headers and response handling.

CRITICAL: Never add UTF-8 BOM to XLSX files! XLSX is a ZIP archive.
"""
from io import BytesIO
from pathlib import Path
from typing import Optional

from django.http import FileResponse, HttpResponse
from openpyxl import Workbook


def create_excel_response(
    workbook: Workbook,
    filename: str,
    use_file: bool = False,
    file_path: Optional[Path] = None,
) -> FileResponse | HttpResponse:
    """
    Create a properly formatted Excel download response.
    
    Args:
        workbook: openpyxl Workbook instance (already populated with data)
        filename: Filename for download (e.g., 'orders.xlsx')
        use_file: If True, save to temp file and use FileResponse (for large files)
        file_path: Optional pre-existing file path to serve
    
    Returns:
        FileResponse or HttpResponse configured for XLSX download
    
    Example:
        wb = Workbook()
        ws = wb.active
        ws.append(['Name', 'Age'])
        ws.append(['John', 30])
        return create_excel_response(wb, 'users.xlsx')
    """
    # Ensure filename has .xlsx extension
    if not filename.endswith('.xlsx'):
        filename = f'{filename}.xlsx'
    
    # Method 1: Use FileResponse with temp file (better for large files)
    if use_file or file_path:
        if not file_path:
            # Save to BytesIO first, then to temp file
            from core.utils.temp_files import save_temp_file
            stream = BytesIO()
            workbook.save(stream)
            stream.seek(0)
            file_path = Path(save_temp_file(stream.getvalue(), 'export', '.xlsx'))
        
        response = FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=filename,
        )
        # CRITICAL: No charset for binary XLSX files
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return response
    
    # Method 2: Use HttpResponse with BytesIO (better for small files)
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    
    response = HttpResponse(
        stream.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    # RFC 6266 compliant Content-Disposition with proper filename encoding
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


def workbook_to_bytes(workbook: Workbook) -> bytes:
    """
    Convert openpyxl Workbook to bytes.
    
    CRITICAL: Does NOT add UTF-8 BOM. XLSX is a ZIP archive and must
    start with PK signature (0x504B0304). Adding BOM corrupts the file.
    
    Args:
        workbook: openpyxl Workbook instance
    
    Returns:
        bytes: Raw XLSX file content
    """
    stream = BytesIO()
    workbook.save(stream)
    stream.seek(0)
    return stream.getvalue()


def prepare_workbook(title: str, headers: list[str]) -> tuple[Workbook, any]:
    """
    Create a new workbook with a single sheet and headers.
    
    Args:
        title: Worksheet title
        headers: List of column headers
    
    Returns:
        Tuple of (Workbook, Worksheet) ready for data appending
    """
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = title
    worksheet.append(headers)
    return workbook, worksheet
