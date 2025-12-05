"""Fix ProductSKU schema - add missing custom_size column"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Check current schema
    cursor.execute("PRAGMA table_info(catalog_productsku);")
    columns = cursor.fetchall()
    print("Current ProductSKU columns:")
    for col in columns:
        print(f"  {col[1]}: {col[2]}")
    
    # Check if custom_size exists
    has_custom_size = any(col[1] == 'custom_size' for col in columns)
    
    if not has_custom_size:
        print("\n❌ Missing custom_size column - adding it now...")
        cursor.execute("""
            ALTER TABLE catalog_productsku
            ADD COLUMN custom_size VARCHAR(100) DEFAULT '' NOT NULL
        """)
        print("✅ custom_size column added successfully!")
    else:
        print("\n✅ custom_size column already exists!")

print("\n" + "="*60)
print("ProductSKU schema fixed. Ready to create test data.")
print("="*60)
