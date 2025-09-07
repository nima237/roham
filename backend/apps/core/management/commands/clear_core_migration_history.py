from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Clears migration history for the core app.'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM django_migrations WHERE app = 'core';")
        self.stdout.write(self.style.SUCCESS('Migration history for core app cleared.')) 