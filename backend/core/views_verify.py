from django.shortcuts import render, get_object_or_404


def verify_document(request, doc_type: str, doc_id: str):
    """Simple verification page for QR codes embedded in PDFs.

    Accepts generic doc_type and id (string). If a known model is referenced and
    the object exists, show a positive confirmation; otherwise show a generic
    failure message. This endpoint is intentionally permissive to allow
    'preview' and non-integer IDs from bulk exports.
    """
    # Import models locally to avoid circulars
    try:
        from orders.models import Order
    except Exception:
        Order = None
    try:
        from payments.models import Payment
    except Exception:
        Payment = None
    try:
        from expenses.models import Expense
    except Exception:
        Expense = None

    models = {
        "order": Order,
        "payment": Payment,
        "expense": Expense,
    }

    model = models.get(doc_type)
    # For bulk/export or preview, we don't have a specific object
    if doc_id in {"preview", "export", "bulk"} or model is None:
        return render(request, "verify.html", {"valid": model is not None, "doc_type": doc_type, "object": None})

    # Try to fetch the object; if id isn't int, this will 404
    obj = get_object_or_404(model, pk=doc_id)
    return render(request, "verify.html", {"valid": True, "object": obj, "doc_type": doc_type})
