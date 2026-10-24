from connection import engine
from sqlalchemy import text

with engine.connect() as connection:
    database_name = connection.execute(
        text("SELECT DATABASE()")
    ).scalar()

    print("MySQL connected successfully!")
    print("Database:", database_name)