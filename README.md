🔧 Gereksinimler

pip install -r requirements.txt

🗄️ MSSQL Veritabanı Oluşturma

MSSQL’de kullanılacak yeni bir veritabanı oluşturun ve adını .env dosyasında belirtin.
.env Örneği

FLASK_APP=app.py
FLASK_ENV=development
DEBUG=True
DB_NAME=[[veritabanı isminiz]]
DB_USER=[[username]]
DB_PASSWORD=[[şifreniz]]
DB_SERVER=localhost
DB_PORT=[[portunuz]]
SECRET_KEY=[[sizin secret key'iniz. Aşağıda nasıl oluşturulacağı var]]
DATABASE_URL=mssql+pyodbc://[[username]]:[[şifreniz]]@localhost:[[portunuz]]/[[veritabanı isminiz]]?driver=ODBC+Driver+17+for+SQL+Server

🔑 SECRET_KEY Oluşturma

Terminalde:

python -c "import secrets; print(secrets.token_hex(16))"

Bu key’i .env dosyanızdaki SECRET_KEY için kullanın.
⚙️ Migration Adımları

flask db init
flask db migrate -m "init"
flask db upgrade

Bu komutlar sorunsuz çalıştığında, yeni oluşturduğunuz veritabanında tablolar oluşmuş olur. SSMS üzerinden kontrol edebilirsiniz.
🚀 Uygulamayı Çalıştırma

flask run

📡 API Kullanımı

Flask çalıştığında terminalde hangi adrese host ettiği yazacak. API çağrıları için bu URL’nin sonuna /api ekleyin.
💸 Expenses
✅ GET (hepsi)

GET http://localhost:5000/api/expenses

🎯 GET (filtreli)

GET http://localhost:5000/api/expenses?region_id=1&date_start=2025-01-01&date_end=2025-12-31

region_id=1 olan ve verilen tarih aralığındaki giderleri döner.
➕ POST (yeni gider girişi)

    URL:

POST http://localhost:5000/api/expenses

Body:

    {
      "group_id": 1,
      "region_id": 1,
      "payment_type_id": 2,
      "account_name_id": 3,
      "budget_item_id": 4,
      "description": "Ofis Kirası Temmuz",
      "date": "2025-07-01T00:00:00",
      "amount": 5000.00,
      "remaining_amount": 5000.00,
      "status": 0
    }

🔗 Diğer Endpointler

    /api/regions

    /api/payment_type

    /api/budget_item

    /api/account_name

Hepsi için GET DELETE PUT POST API’lar mevcuttur.
👤 Users
📝 Register

POST http://localhost:5000/api/users/register

    Body:

    {
      "username": "username",
      "password": "123",
      "role": 1
    }

Role	Anlamı
1	Admin
2	Kullanıcı
3	İzleyici
🔑 Login

POST http://localhost:5000/api/users/login

    Body:

    {
      "username": "username",
      "password": "123"
    }

Bu istek başarılı olduğunda bir JWT <token> dönecektir. Bu token, JWT gerektiren API’lara erişirken kullanılacaktır.
🔍 Örnek

Diğer userları görmek için JWT gerekir:

GET http://localhost:5000/api/users/
Authorization: Bearer <token>

📬 Postman Kullanımı

    Headers → Key: Authorization

    Value: Bearer <token>

🖥️ httpie ile Test

http GET http://localhost:5000/api/users/ 'Authorization: Bearer eyJhbGc...'
