
import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend') 

# Load configuration from Django settings with namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# Optional: Configure periodic tasks
app.conf.beat_schedule = {
    'cleanup-old-emails': {
        'task': 'notifications.tasks.cleanup_old_email_logs',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery"""
    print(f'Request: {self.request!r}')
