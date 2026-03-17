# Here is the service for the email sending

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def send_templated_email(subject, template_name, context, recipients):

    html_content = render_to_string(template_name, context)

    email = EmailMultiAlternatives(
        subject=subject,
        body="Une nouvelle opération nécessite votre attention.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )

    email.attach_alternative(html_content, "text/html")
    email.send()