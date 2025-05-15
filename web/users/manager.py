from fastapi_users import BaseUserManager
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from web.users.models import User
from sqlalchemy.ext.asyncio import AsyncSession
from web.db import get_async_session
from fastapi import Depends

class UserManager(BaseUserManager[User, int]):
    def __init__(self, user_db: SQLAlchemyUserDatabase[User, int]):
        super().__init__(user_db)
        self.user_db = user_db

    def parse_id(self, id: str) -> int:
        return int(id)

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)