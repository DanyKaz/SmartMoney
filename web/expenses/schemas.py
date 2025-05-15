from pydantic import BaseModel, ConfigDict

class MonthRead(BaseModel):
    id: int
    name: str

    class Config:
        model_config = ConfigDict(from_attributes=True)

class CategoryRead(BaseModel):
    id: int
    name: str
    month_id: int
    user_id: int

    class Config:
        model_config = ConfigDict(from_attributes=True)

class ProductRead(BaseModel):
    id: int
    name: str
    category_id: int

    class Config:
        model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    month_id: int
    category_id: int
    product_id: int
    amount: float

class ExpenseRead(BaseModel):
    id: int
    month: MonthRead
    category: CategoryRead
    product: ProductRead
    amount: float

    class Config:
        model_config = ConfigDict(from_attributes=True)

class CategoryCreate(BaseModel):
    name: str
    month_id: int