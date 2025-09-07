from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Drops all tables in the database (for development use only!)'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
            tables = [row[0] for row in cursor.fetchall()]
            for table in tables:
                self.stdout.write(self.style.WARNING(f'Dropping table: {table}'))
                cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
        self.stdout.write(self.style.SUCCESS('All tables dropped.')) 