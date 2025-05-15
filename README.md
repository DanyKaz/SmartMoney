# SmartMoney

Приложение для учёта расходов, разработанное с использованием **FastAPI** и **PostgreSQL**. Запуск производится через **Docker Compose**, база данных создаётся автоматически.

---

## Начало работы

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/DanyKaz/SmartMoney
cd your-repo-name
```
### 2. Создайте файл .env в корне проекта, скопирав данные из .env.example

### 3. Запустите приложение

```bash
docker-compose up --build
```

### 4. Откройте в браузере

```bash
http://localhost:8000
```

---

### В случае ошибок при запуске, остановите все контейнеры, пересоберите и запустите их заново

```bash
docker-compose down
docker-compose up --build
```