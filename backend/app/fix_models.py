import os

file_path = r'c:\Users\meir\Documents\paint-web\backend\app\models.py'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = [line for line in lines if 'role = Column(String' not in line]

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Role column removed successfully")
