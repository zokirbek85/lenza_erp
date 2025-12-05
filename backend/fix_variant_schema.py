"""Fix database schema - remove description from ProductVariant"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

# Check current schema
with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(catalog_productvariant);")
    columns = cursor.fetchall()
    print("Current ProductVariant columns:")
    for col in columns:
        print(f"  {col[1]}: {col[2]} {'NOT NULL' if col[3] else 'NULL'}")
    
    # Check if description column exists
    has_description = any(col[1] == 'description' for col in columns)
    
    if has_description:
        print("\n❌ Found description column - needs to be removed")
        print("Dropping description column...")
        
        # SQLite doesn't support DROP COLUMN directly, need to recreate table
        # But since we just created it, simpler to just allow NULL
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS catalog_productvariant_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_model_id BIGINT NOT NULL REFERENCES catalog_productmodel(id),
                color VARCHAR(150) NOT NULL,
                door_type VARCHAR(10) NOT NULL,
                image VARCHAR(100),
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );
        """)
        
        # Copy data if any exists
        cursor.execute("SELECT COUNT(*) FROM catalog_productvariant")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"Copying {count} existing records...")
            cursor.execute("""
                INSERT INTO catalog_productvariant_new 
                (id, product_model_id, color, door_type, image, is_active, created_at, updated_at)
                SELECT id, product_model_id, color, door_type, image, is_active, created_at, updated_at
                FROM catalog_productvariant
            """)
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE catalog_productvariant")
        cursor.execute("ALTER TABLE catalog_productvariant_new RENAME TO catalog_productvariant")
        
        # Recreate indexes
        cursor.execute("""
            CREATE INDEX catalog_pro_product_70dc21_idx 
            ON catalog_productvariant (product_model_id, is_active)
        """)
        
        cursor.execute("""
            CREATE UNIQUE INDEX catalog_productvariant_unique_together
            ON catalog_productvariant (product_model_id, color, door_type)
        """)
        
        print("✅ Description column removed successfully!")
    else:
        print("\n✅ No description column found - schema is correct!")

print("\n" + "="*60)
print("Database schema fixed. You can now run create_test_catalog.py")
print("="*60)
