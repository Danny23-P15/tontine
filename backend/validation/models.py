from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL


class ValidationGroup(models.Model):
    initiator = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="owned_group",
        help_text="L'utilisateur qui a créé ce groupe."
    )

    name = models.CharField(max_length=150)
    max_validators = models.PositiveIntegerField(default=5)

    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # L’initiateur ne doit pas déjà avoir un groupe
        if ValidationGroup.objects.filter(initiator=self.initiator).exclude(id=self.id).exists():
            raise ValidationError("Cet utilisateur a déjà créé un groupe.")

    def __str__(self):
        return f"Groupe {self.name} (initiateur : {self.initiator.username})"


class GroupValidator(models.Model):
    """
    Table pivot entre User et ValidationGroup.
    Chaque enregistrement = un validateur ajouté à un groupe.
    """
    group = models.ForeignKey(ValidationGroup, on_delete=models.CASCADE, related_name="validators")
    validator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="validator_groups")
    validated = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('group', 'validator')

    def clean(self):
        # L’initiateur ne peut pas être validateur
        if self.validator == self.group.initiator:
            raise ValidationError("L’initiateur ne peut pas être validateur de son propre groupe.")

        # Ne pas dépasser max_validators
        count = GroupValidator.objects.filter(group=self.group).exclude(id=self.id).count()
        if count >= self.group.max_validators:
            raise ValidationError("Ce groupe a atteint le nombre maximum de validateurs.")

    def __str__(self):
        return f"{self.validator.username} → {self.group.name}"


class GroupCreationValidation(models.Model):
    """
    Permet de suivre l'état final de la création du groupe
    (ex: tous les validateurs doivent valider)
    """
    group = models.OneToOneField(ValidationGroup, on_delete=models.CASCADE, related_name="creation_status")
    is_fully_validated = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Validation création {self.group.name}"
