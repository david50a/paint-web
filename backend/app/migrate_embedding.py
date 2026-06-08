import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print("Adding embedding column to posts table (TEXT, if not exists)...")
cur.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='posts' AND column_name='embedding'
        ) THEN
            ALTER TABLE posts ADD COLUMN embedding TEXT;
        END IF;
    END
    $$;
""")
print("OK")

cur.close()
conn.close()
print("\nMigration complete!")
