from django.core.management.base import BaseCommand
from django.utils import timezone
from groups.models import Operation, OperationStatus


class Command(BaseCommand):
    help = 'Mark operations as expired if expires_at is reached'

    def handle(self, *args, **options):
        now = timezone.now()
        expired_operations = Operation.objects.filter(
            expires_at__lte=now,
            status__in=[OperationStatus.PENDING, OperationStatus.APPROVED]
        )
        count = expired_operations.update(status=OperationStatus.EXPIRED)
        self.stdout.write(
            self.style.SUCCESS(f'Successfully marked {count} operations as expired')
        )