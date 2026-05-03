from django.urls import path
from .views import (
    SensorLocationListView,
    SensorLocationDetailView,
    SensorImportListView,
    SensorImportView,
    SensorSummaryView,
    SensorReadingsView,
    RpaTriggerView,
    SensorExportView,
)

urlpatterns = [
    path("sensors/locations/", SensorLocationListView.as_view(), name="sensor_locations"),
    path("sensors/locations/<int:pk>/", SensorLocationDetailView.as_view(), name="sensor_location_detail"),
    path("sensors/imports/", SensorImportListView.as_view(), name="sensor_imports"),
    path("sensors/import/", SensorImportView.as_view(), name="sensor_import"),
    path("sensors/summary/", SensorSummaryView.as_view(), name="sensor_summary"),
    path("sensors/readings/", SensorReadingsView.as_view(), name="sensor_readings"),
    path("sensors/rpa/", RpaTriggerView.as_view(), name="sensor_rpa"),
    path("sensors/export/", SensorExportView.as_view(), name="sensor_export"),
]
