from fastapi import FastAPI, Depends, Request, HTTPException, Response, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from web.db import engine, async_session, get_async_session
from web.users.models import Base
from web.users.router import router as users_router, current_user
from sqlalchemy.ext.asyncio import AsyncSession
from web.expenses.models import Month, Category, Product, Expense
from sqlalchemy import select, func, desc, and_
import os
import json

app = FastAPI(title="Finance App")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

templates = Jinja2Templates(directory=TEMPLATES_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def login_required(user=Depends(current_user(optional=True))):
    if user is None:
        raise HTTPException(status_code=302, headers={"Location": "/login"})
    return user

@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("registration.html", {"request": request})

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/start")
async def start_page(request: Request):
    return templates.TemplateResponse("start.html", {"request": request})

@app.get("/incurring")
async def incurring_page(request: Request, user=Depends(login_required)):
    return templates.TemplateResponse("incurring.html", {"request": request, "user": user})

@app.get("/statistic-month")
async def statistic_month_page(request: Request, user=Depends(login_required)):
    return templates.TemplateResponse("statistic_month.html", {"request": request, "user": user})

@app.get("/statistic-year")
async def statistic_year_page(request: Request, user=Depends(login_required)):
    return templates.TemplateResponse("statistic_year.html", {"request": request, "user": user})

@app.post("/logout")
async def logout(response: Response):
    response = RedirectResponse(url="/start", status_code=303)
    response.delete_cookie("finance_session")
    return response

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        result = await session.execute(select(Month))
        months = result.scalars().all()
        if not months:
            month_names = [
                "Январь", "Февраль", "Март", "Апрель",
                "Май", "Июнь", "Июль", "Август",
                "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
            ]
            session.add_all([Month(name=name) for name in month_names])
            await session.commit()

app.include_router(users_router)

@app.get("/")
async def root(
    request: Request,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(
        select(Category.month_id)
        .join(Expense, Expense.category_id == Category.id)
        .where(Category.user_id == user.id)
        .order_by(desc(Expense.id))
        .limit(1)
    )
    month_id = result.scalar_one_or_none() or 1

    result = await session.execute(
        select(func.sum(Expense.amount))
        .join(Category, Category.id == Expense.category_id)
        .where(Category.month_id == month_id, Category.user_id == user.id)
    )
    total = result.scalar_one() or 0

    result = await session.execute(
        select(Category.name, func.sum(Expense.amount).label("total"))
        .join(Expense, Expense.category_id == Category.id)
        .where(Category.month_id == month_id, Category.user_id == user.id)
        .group_by(Category.name)
        .order_by(desc("total"))
        .limit(1)
    )
    top_category = result.first()
    top_category_name = top_category[0] if top_category else "—"

    result = await session.execute(
        select(Product.name, func.sum(Expense.amount).label("total"))
        .join(Expense, Expense.product_id == Product.id)
        .join(Category, Category.id == Expense.category_id)
        .where(Category.month_id == month_id, Category.user_id == user.id)
        .group_by(Product.name)
        .order_by(desc("total"))
        .limit(1)
    )
    top_product = result.first()
    top_product_str = f"{top_product[0]} - {int(top_product[1])} рублей" if top_product else "—"

    month_names = {
        1: "январе", 2: "феврале", 3: "марте", 4: "апреле", 5: "мае", 6: "июне",
        7: "июле", 8: "августе", 9: "сентябре", 10: "октябре", 11: "ноябре", 12: "декабре"
    }

    return templates.TemplateResponse("index.html", {
        "request": request,
        "user": user,
        "month": month_names.get(month_id, "месяце"),
        "total": int(total),
        "top_category": top_category_name,
        "top_product": top_product_str
    })

@app.get("/api/categories")
async def get_categories(
    month_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Category).where(Category.user_id == user.id, Category.month_id == month_id)
    )
    categories = result.scalars().all()
    return [{"id": cat.id, "name": cat.name} for cat in categories]

@app.post("/api/categories")
async def create_category(
    name: str = Form(...),
    month_id: int = Form(...),
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Category).where(
            and_(
                Category.name == name,
                Category.month_id == month_id,
                Category.user_id == user.id
            )
        )
    )
    existing = result.scalars().first()

    if existing:
        return {"status": "exists", "id": existing.id, "name": existing.name}

    new_category = Category(name=name, month_id=month_id, user_id=user.id)
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    return {"status": "created", "id": new_category.id, "name": new_category.name}

@app.get("/api/products")
async def get_products(
    category_id: int,
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Product).where(Product.category_id == category_id)
    )
    products = result.scalars().all()
    return [{"id": p.id, "name": p.name} for p in products]

@app.post("/api/products")
async def add_products(
    category_id: int = Form(...),
    names: str = Form(...),
    session: AsyncSession = Depends(get_async_session)
):
    name_list = [name.strip() for name in names.split(",") if name.strip()]
    if not name_list:
        return {"status": "no_products", "count": 0}

    result = await session.execute(
        select(Product).where(
            and_(
                Product.category_id == category_id,
                Product.name.in_(name_list)
            )
        )
    )
    existing_products = {p.name for p in result.scalars().all()}

    new_names = [name for name in name_list if name not in existing_products]

    if not new_names:
        return {"status": "already_exists", "count": 0}

    products = [Product(name=name, category_id=category_id) for name in new_names]
    session.add_all(products)
    await session.commit()

    return {"status": "created", "count": len(products)}

@app.get("/api/expenses")
async def get_expense_sums(
    category_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Expense.product_id, func.sum(Expense.amount))
        .where(Expense.category_id == category_id, Expense.user_id == user.id)
        .group_by(Expense.product_id)
    )
    data = result.all()
    return {str(product_id): float(total) for product_id, total in data}

@app.post("/api/expenses")
async def add_expenses(
    category_id: int = Form(...),
    expenses: str = Form(...),
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):
    expense_data = json.loads(expenses)
    category_result = await session.execute(
        select(Category).where(Category.id == category_id)
    )
    category = category_result.scalar_one()

    new_expenses = []
    for product_id_str, amount in expense_data.items():
        try:
            product_id = int(product_id_str)
            amount = float(amount)
        except ValueError:
            continue
        if amount <= 0:
            continue
        new_expenses.append(Expense(
            user_id=user.id,
            month_id=category.month_id,
            category_id=category_id,
            product_id=product_id,
            amount=amount
        ))

    if new_expenses:
        session.add_all(new_expenses)
        await session.commit()

    return {"status": "ok", "count": len(new_expenses)}


@app.get("/api/last-month")
async def get_last_active_month(
        user=Depends(login_required),
        session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Expense.month_id)
        .filter(Expense.user_id == user.id)
        .order_by(Expense.id.desc())
    )

    last_expense = result.scalars().first()

    return {"month_id": last_expense or 1}

@app.get("/api/stat/monthly")
async def get_monthly_stats(
    month_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(
        select(Category.name, func.sum(Expense.amount))
        .join(Category, Expense.category_id == Category.id)
        .where(Expense.user_id == user.id, Category.month_id == month_id)
        .group_by(Category.name)
    )
    return {row[0]: float(row[1]) for row in result.all()}

@app.get("/api/stat/category")
async def get_category_stats(
    month_id: int,
    category_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(
        select(Product.name, func.sum(Expense.amount))
        .join(Product, Expense.product_id == Product.id)
        .join(Category, Category.id == Expense.category_id)
        .where(
            Expense.user_id == user.id,
            Expense.category_id == category_id,
            Category.month_id == month_id
        )
        .group_by(Product.name)
    )
    return {row[0]: float(row[1]) for row in result.all()}

@app.get("/api/categories/by-month")
async def get_categories_by_month(
    month_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Category.id, Category.name)
        .where(Category.user_id == user.id, Category.month_id == month_id)
        .order_by(Category.id)
    )
    return [{"id": row[0], "name": row[1]} for row in result.all()]

@app.get("/api/stat/categories-by-month")
async def get_categories_stats_by_month(
    month_id: int,
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(
        select(Category.name, func.sum(Expense.amount))
        .join(Category, Category.id == Expense.category_id)
        .where(Category.month_id == month_id, Category.user_id == user.id)
        .group_by(Category.name)
    )
    return {row[0]: float(row[1]) for row in result.all()}

@app.get("/api/stat/by-months")
async def get_yearly_month_stats(
    user=Depends(login_required),
    session: AsyncSession = Depends(get_async_session)
):

    result = await session.execute(
        select(Month.name, func.sum(Expense.amount))
        .join(Category, Category.id == Expense.category_id)
        .join(Month, Month.id == Category.month_id)
        .where(Category.user_id == user.id)
        .group_by(Month.name)
    )
    return {row[0]: float(row[1]) for row in result.all()}