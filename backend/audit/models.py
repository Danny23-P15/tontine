from django.db import models
from core.models import User
from groups.models import Operation

class AdminActionLog(models.Model):
    ACTION_CHOICES = (
        ("OVERRIDE_OPERATION", "Override Operation"),
    )

    admin = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, null=True, blank=True)

    decision = models.CharField(max_length=20, null=True, blank=True)  # "accept" ou "refuse"

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.admin.full_name} - {self.action} - {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
