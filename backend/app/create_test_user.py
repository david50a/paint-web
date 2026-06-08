import database, models
from utils.security import get_password_hash

def create_user():
    db = next(database.get_db())
    user = db.query(models.User).filter(models.User.username == 'testuser').first()
    if not user:
        user = models.User(
            username='testuser', 
            email='test@example.com', 
            hashed_password=get_password_hash('Password123!'), 
            is_active=True
        )
        db.add(user)
        db.commit()
        print('User created')
    else:
        print('User already exists')

if __name__ == "__main__":
    create_user()
