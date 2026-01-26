from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):

    def get_by_natural_key(self, phone_number):
        return self.get(phone_number=phone_number)

    def create_user(self, phone_number, cin, full_name, password=None):
        if not phone_number:
            raise ValueError("Phone number is required")

        user = self.model(
            phone_number=phone_number,
            cin=cin,
            full_name=full_name
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, cin, full_name, password):
        user = self.create_user(
            phone_number=phone_number,
            cin=cin,
            full_name=full_name,
            password=password
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user
