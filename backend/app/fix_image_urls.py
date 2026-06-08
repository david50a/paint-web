from dotenv import load_dotenv; load_dotenv()
import psycopg2, os

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute("SELECT id, image_url FROM posts WHERE image_url NOT LIKE '/uploads/posts/%' AND image_url IS NOT NULL")
rows = cur.fetchall()
for row_id, url in rows:
    new_url = '/uploads/posts/' + url.split('/')[-1]
    print(f'Fix post {row_id}: {url} -> {new_url}')
    cur.execute('UPDATE posts SET image_url = %s WHERE id = %s', (new_url, row_id))
conn.commit()
cur.close()
conn.close()
print('Done')
