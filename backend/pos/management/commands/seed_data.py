from django.core.management.base import BaseCommand
from pos.models import MotorcycleModel, Category, BusinessSetting

class Command(BaseCommand):
    help = 'Seeds initial motorcycle models, categories, and business settings for Sawa POS'

    def handle(self, *args, **kwargs):
        # 1. Seed Business Settings
        setting, created = BusinessSetting.objects.get_or_create(
            id=1,
            defaults={
                'shop_name': 'Sawa Motorcycle Spare Parts POS',
                'phone': '+254 712160288',
                'currency': 'KES',
                'default_tax_rate': 0.00
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Initialized Sawa POS Business Settings.'))

        # 2. Seed Motorcycle Models
        bikes = [
            {'make': 'Bajaj', 'model_name': 'Boxer BM 100', 'year_range': '2018-2026'},
            {'make': 'Bajaj', 'model_name': 'Boxer BM 150', 'year_range': '2018-2026'},
            {'make': 'TVS', 'model_name': 'Star HLX 125', 'year_range': '2019-2026'},
            {'make': 'TVS', 'model_name': 'Star HLX 150', 'year_range': '2020-2026'},
            {'make': 'Honda', 'model_name': 'Ace 110', 'year_range': '2021-2026'},
            {'make': 'Bajaj', 'model_name': 'Discover 135', 'year_range': '2015-2023'},
        ]

        for bike in bikes:
            obj, created = MotorcycleModel.objects.get_or_create(
                make=bike['make'],
                model_name=bike['model_name'],
                defaults={'year_range': bike['year_range']}
            )
            if created:
                self.stdout.write(f"Added Motorcycle Model: {obj}")

        # 3. Seed Spare Parts Categories
        categories = [
            'Spark Plugs',
            'Brake Pads & Shoes',
            'Chains & Sprockets',
            'Clutch Plates',
            'Engine Oil & Lubricants',
            'Air & Oil Filters',
            'Tyres & Inner Tubes',
            'Bearings',
            'Cables, Levers & Mirrors',
            'Batteries & Electrical',
            'Bulbs & Indicators',
            'Body Parts & Accessories'
        ]

        for cat_name in categories:
            cat, created = Category.objects.get_or_create(name=cat_name)
            if created:
                self.stdout.write(f"Added Category: {cat.name}")

        self.stdout.write(self.style.SUCCESS('Sawa POS database seeded successfully!'))