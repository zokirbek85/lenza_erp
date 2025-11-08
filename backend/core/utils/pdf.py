from django.template.loader import render_to_string
from weasyprint import HTML


def render_pdf(template_path: str, context: dict) -> bytes:
    html = render_to_string(template_path, context)
    return HTML(string=html).write_pdf()
