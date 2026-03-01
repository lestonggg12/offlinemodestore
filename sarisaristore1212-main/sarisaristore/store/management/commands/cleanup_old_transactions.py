"""
Django management command to delete old transaction records daily.
Keeps aggregated summary data (DailySummary, PeriodTotals) intact.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from store.models import Sale, DailySummary, PeriodTotals
from django.db.models import Sum


class Command(BaseCommand):
    help = 'Delete old sale transactions (older than 24 hours) while preserving summary data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Delete transactions older than N days (default: 1)',
        )

    def handle(self, *args, **options):
        days_threshold = options['days']
        cutoff_time = timezone.now() - timedelta(days=days_threshold)
        
        # Get sales to be deleted
        old_sales = Sale.objects.filter(date__lt=cutoff_time)
        
        if not old_sales.exists():
            self.stdout.write(
                self.style.SUCCESS('✅ No old transactions to delete.')
            )
            return
        
        # Before deleting, ensure DailySummary exists for these dates
        # So aggregated data is preserved
        dates_to_summarize = set()
        for sale in old_sales:
            dates_to_summarize.add(sale.date.date())
        
        # Generate/update summaries for each date
        for target_date in dates_to_summarize:
            DailySummary.generate_summary_for_date(target_date)
        
        # Delete old transactions
        count, _ = old_sales.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Deleted {count} old transaction records (older than {days_threshold} day(s)).'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                '✅ Summary data (profit, sales totals) preserved in DailySummary.'
            )
        )
