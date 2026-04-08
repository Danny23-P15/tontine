from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/", include("groups.urls")),
    path("api/", include("operations.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/admin/", include("backend.apps.admin_panel.urls")),

]

