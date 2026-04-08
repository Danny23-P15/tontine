from django.contrib import admin
from .models import AdminActionLog


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ('admin', 'action', 'decision', 'created_at')
    list_filter = ('action', 'decision', 'created_at')
    search_fields = ('admin__full_name',)
    readonly_fields = ('created_at',)
