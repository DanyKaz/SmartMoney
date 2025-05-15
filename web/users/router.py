from fastapi import APIRouter
from fastapi_users import FastAPIUsers
from web.users.models import User
from web.users.schemas import UserRead, UserCreate, UserUpdate
from web.users.manager import get_user_manager
from web.config import SECRET_KEY
from fastapi_users.authentication import CookieTransport, AuthenticationBackend, JWTStrategy

cookie_transport = CookieTransport(
    cookie_name="finance_session",
    cookie_max_age=3600,
)

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=SECRET_KEY,
        lifetime_seconds=3600,
        algorithm="HS256",
    )

auth_backend = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

current_user = fastapi_users.current_user

current_active_user = fastapi_users.current_user(active=True)

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)