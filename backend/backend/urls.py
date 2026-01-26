from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/", include("groups.urls")),
    path("api/notifications/", include("notifications.urls")),

]

# def test(request):
#     return HttpResponse("OK")

# urlpatterns += [
#     path("api/test/", test),
