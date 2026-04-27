from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from django.db.models.functions import TruncDate

from groups.models import Transaction, OperationStatus


def get_group_transactions_stats(group, period="week"):
    now = timezone.now()

    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        raise ValueError("Invalid period")

    queryset = (
        Transaction.objects.filter(
            operation__group=group,
            operation__status=OperationStatus.COMPLETED,
            executed_at__gte=start_date
        )
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(total=Sum("amount"))
        .order_by("date")
    )

    return [
        {
            "date": item["date"].strftime("%Y-%m-%d"),
            "total": float(item["total"] or 0)
        }
        for item in queryset
    ]