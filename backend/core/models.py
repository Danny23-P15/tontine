from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import UserManager   # ← IMPORTANT

class User(AbstractBaseUser, PermissionsMixin):
    phone_number = models.CharField(max_length=20, unique=True)
    cin = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=150)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()  

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['cin', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"
