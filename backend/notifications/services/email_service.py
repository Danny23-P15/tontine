# notifications/services/email_service.py
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
import logging

logger = logging.getLogger(__name__)


def send_templated_email(subject, template_name, context, recipients):
    """
    Envoie un email avec template HTML.
    """
    
    try:
        html_content = render_to_string(template_name, context)
        
        # Vérifier que DEFAULT_FROM_EMAIL est configuré
        from_email = settings.DEFAULT_FROM_EMAIL
        if not from_email:
            from_email = 'noreply@tontine.com'
        
        email = EmailMultiAlternatives(
            subject=subject,
            body="Une nouvelle opération nécessite votre attention.",
            from_email=from_email,
            to=recipients if isinstance(recipients, list) else [recipients],
        )

        email.attach_alternative(html_content, "text/html")
        email.send()
        
        return True
        
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'email: {e}")
        return False