from flask import jsonify

class AppError(Exception):
    """Base application error class."""
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_dict(self):
        return {'error': self.message}

def handle_app_error(error):
    """Handler for AppError exceptions."""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

def handle_generic_error(error):
    """Handler for generic 500 errors."""
    response = jsonify({'error': 'Internal Server Error'})
    response.status_code = 500
    return response

def register_error_handlers(app):
    app.register_error_handler(AppError, handle_app_error)
    app.register_error_handler(Exception, handle_generic_error)
