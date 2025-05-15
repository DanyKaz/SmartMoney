from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from web.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_async_session() -> AsyncSession:
    async with async_session() as session:
        yield session