import hashlib
import hmac
import logging
from io import BytesIO
from xml.sax.saxutils import escape

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.models import User
from groups.models import Transaction, ValidationStatus

logger = logging.getLogger(__name__)

DARK = colors.HexColor("#111827")
LIME = colors.HexColor("#c6f45a")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#e5e7eb")
SOFT = colors.HexColor("#f6f5f0")


def _amount(value) -> str:
    # Decimal("1500") -> "1 500,00 Ar"
    return f"{value:,.2f}".replace(",", " ").replace(".", ",") + " Ar"


def _dt(value) -> str:
    local = timezone.localtime(value)
    return f"{local:%d/%m/%Y} à {local:%H:%M}"


def _person(phone: str) -> str:
    user = User.objects.filter(phone_number=phone).first()
    return f"{user.full_name} ({phone})" if user else phone


def verification_code(tx) -> str:
    msg = "|".join([
        tx.reference or "",
        tx.operation.reference,
        str(tx.amount),
        tx.recipient_phone_number,
        tx.executed_at.isoformat(),
    ])
    digest = hmac.new(
        settings.SECRET_KEY.encode(), msg.encode(), hashlib.sha256
    ).hexdigest()[:16].upper()
    return "-".join(digest[i:i + 4] for i in range(0, 16, 4))


def build_receipt_pdf(tx) -> bytes:
    op = tx.operation
    group = op.group
    accepted = list(
        op.validations.filter(status=ValidationStatus.ACCEPTED).order_by("validated_at")
    )
    total = op.validations.count()
    code = verification_code(tx)
    generated = _dt(timezone.now())

    base = getSampleStyleSheet()["Normal"]
    p_label = ParagraphStyle("label", parent=base, fontSize=9, textColor=MUTED, leading=12)
    p_value = ParagraphStyle("value", parent=base, fontSize=10.5, textColor=DARK, leading=14)
    p_brand = ParagraphStyle("brand", parent=base, fontName="Helvetica-Bold", fontSize=10, textColor=LIME)
    p_title = ParagraphStyle("title", parent=base, fontName="Helvetica-Bold", fontSize=18,
                             textColor=colors.white, leading=22)
    p_amount = ParagraphStyle("amount", parent=base, fontName="Helvetica-Bold", fontSize=26,
                              textColor=DARK, leading=30)
    p_h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=12,
                          textColor=DARK, spaceBefore=14, spaceAfter=6)

    def P(text, style=p_value):
        # escape() : le motif est saisi par l'utilisateur ("<", "&"...)
        return Paragraph(escape(str(text)), style)

    header = Table([[P("VALIDEO", p_brand)], [P("Justificatif de transaction", p_title)]],
                   colWidths=[170 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, 0), 14),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
        ("LINEBELOW", (0, -1), (-1, -1), 3, LIME),
    ]))

    amount_box = Table([[P("Montant transféré", p_label)], [P(_amount(tx.amount), p_amount)]],
                       colWidths=[170 * mm])
    amount_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, 0), 12),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
    ]))

    rows = [
        ("Référence de la transaction", tx.reference or "-"),
        ("Référence de l'opération", op.reference),
        ("Date d'exécution", _dt(tx.executed_at)),
        ("Groupe", group.group_name),
        ("Initiateur", _person(op.initiator_phone_number)),
        ("Bénéficiaire", _person(tx.recipient_phone_number)),
        ("Motif", tx.reason or "-"),
    ]
    details = Table([[P(k, p_label), P(v)] for k, v in rows], colWidths=[55 * mm, 115 * mm])
    details.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))

    val_rows = [[P("Validateur", p_label), P("Décision", p_label), P("Date", p_label)]]
    for v in accepted:
        val_rows.append([
            P(_person(v.validator_phone_number)),
            P("Accepté"),
            P(_dt(v.validated_at) if v.validated_at else "-"),
        ])
    validations = Table(val_rows, colWidths=[85 * mm, 30 * mm, 55 * mm])
    validations.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    story = [
        header, Spacer(1, 8 * mm),
        amount_box,
        P("Détails", p_h2), details,
        P("Validation", p_h2),
        P(f"Quorum requis : {group.quorum} - validations obtenues : {len(accepted)} sur {total}"),
        Spacer(1, 3 * mm), validations,
    ]

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(20 * mm, 18 * mm, A4[0] - 20 * mm, 18 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(20 * mm, 13 * mm,
                          f"Document généré le {generated} - Code de vérification : {code}")
        canvas.drawRightString(A4[0] - 20 * mm, 13 * mm, "Valideo")
        canvas.restoreState()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=25 * mm,
        title=f"Justificatif {tx.reference or tx.pk}", author="Valideo",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def generate_receipt(transaction_id: int, force: bool = False):
    """
    Génère et stocke le justificatif. Retourne la Transaction, ou None si la
    transaction n'est pas exécutée ou si la génération échoue.
    Idempotent : un PDF existant n'est jamais écrasé sans force=True.
    Ne lève jamais d'exception : un échec de PDF ne doit pas casser une transaction.
    """
    try:
        with transaction.atomic():
            tx = (
                Transaction.objects.select_for_update(of=("self",))
                .select_related("operation__group")
                .get(pk=transaction_id)
            )
            if tx.executed_at is None:
                return None
            if tx.receipt_pdf and not force:
                return tx

            pdf_bytes = build_receipt_pdf(tx)
            tx.receipt_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
            tx.receipt_generated_at = timezone.now()
            tx.receipt_pdf.save(f"{tx.reference or tx.pk}.pdf", ContentFile(pdf_bytes), save=False)
            tx.save(update_fields=["receipt_pdf", "receipt_generated_at", "receipt_sha256"])
            return tx
    except Exception:
        logger.exception("Échec de génération du justificatif (transaction %s)", transaction_id)
        return None