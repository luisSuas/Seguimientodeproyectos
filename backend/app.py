from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from data_processor import DataProcessor

# === Cambiado: montamos ../frontend en la raíz ('/') ===
app = Flask(
    __name__,
    static_folder='../frontend',  # apunta a tu carpeta frontend
    static_url_path=''            # monta esos archivos en la raíz
)
CORS(app)

# Configuración de rutas
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

excel_path = os.path.join(UPLOAD_FOLDER, 'Base_ISIP.xlsx')
if not os.path.exists(excel_path):
    raise FileNotFoundError(f"No se encontró el archivo Excel en: {excel_path}")

processor = DataProcessor(excel_path)

# Sirve index.html desde la carpeta frontend
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

# Rutas de la API
@app.route('/api/geojson', methods=['GET'])
def get_geojson():
    return jsonify(processor.get_geojson())

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify(processor.get_summary_stats())

@app.route('/api/departments', methods=['GET'])
def get_departments():
    return jsonify(processor.get_all_departments())

@app.route('/api/projects/<department>', methods=['GET'])
def get_projects(department):
    return jsonify(processor.get_projects_by_department(department))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
