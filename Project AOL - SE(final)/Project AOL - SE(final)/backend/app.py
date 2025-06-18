from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db
from routes import routes
from flask_session import Session

app = Flask(__name__)
app.config.from_object(Config)

# Aktifkan CORS dengan kredensial
CORS(app, supports_credentials=True)

# Setup session
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Inisialisasi database
db.init_app(app)

# Register blueprint
app.register_blueprint(routes)

# Buat tabel saat pertama kali
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
