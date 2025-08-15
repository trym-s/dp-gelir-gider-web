from flask import Blueprint, request, jsonify
from . import services
import logging

importer_bp = Blueprint('importer_api', __name__, url_prefix='/api/importer')

@importer_bp.route('/file-parser', methods=['POST'])
def parse_uploaded_file():
    """
    Yüklenen bir Excel veya PDF dosyasını ayrıştırır ve
    onay ekranı için yapılandırılmış bir JSON döner.
    """
    if 'file' not in request.files:
        return jsonify({"error": "Dosya bulunamadı ('file' alanı eksik)."}), 400

    file = request.files['file']
    file_type = request.form.get('type')
    bank_name = request.form.get('bank_name')

    if not file or not file.filename:
        return jsonify({"error": "Geçerli bir dosya seçilmedi."}), 400
    if not file_type:
        return jsonify({"error": "'type' alanı (pdf/excel) zorunludur."}), 400

    try:
        # Servis katmanındaki iş mantığını çağır
        df = services.parse_file_to_dataframe(file.stream, file_type, bank_name)
        
        # DataFrame'i frontend'e gönderilecek JSON'a çevir
        records_json = df.to_dict(orient='records')
        return jsonify(records_json), 200

    except ValueError as ve:
        # Servis katmanından gelen beklenen hatalar (örn: yanlış banka adı)
        logging.warning(f"Dosya ayrıştırma uyarısı: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        # Beklenmedik sunucu hataları
        logging.exception(f"Dosya ayrıştırma sırasında kritik hata oluştu. {e}")
        return jsonify({f"error": "Dosya işlenirken sunucuda bir hata oluştu. {e} "}), 500
