from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from web.users.models import Base

class Month(Base):
    __tablename__ = "months"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    month_id = Column(Integer, ForeignKey("months.id"), nullable=False)

    user = relationship("User", backref="categories")
    month = relationship("Month")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    category = relationship("Category", backref="products")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    month_id = Column(Integer, ForeignKey("months.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    amount = Column(Float, nullable=False)

    user = relationship("User", backref="expenses")
    month = relationship("Month")
    category = relationship("Category")
    product = relationship("Product")
