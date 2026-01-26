from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import ValidationGroup, GroupValidator, GroupCreationValidation


class GroupValidatorInline(admin.TabularInline):
    model = GroupValidator
    extra = 1


@admin.register(ValidationGroup)
class ValidationGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "initiator", "max_validators", "created_at")
    inlines = [GroupValidatorInline]


admin.register(GroupCreationValidation)(admin.ModelAdmin)
