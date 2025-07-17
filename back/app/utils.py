from flask import jsonify

def api_success(data, status_code=200, pagination=None):
    """
    Generates a standardized successful API response.
    
    :param data: The main payload of the response.
    :param status_code: The HTTP status code.
    :param pagination: Optional dictionary for pagination details.
    :return: A Flask JSON response.
    """
    response = {
        "success": True,
        "data": data
    }
    if pagination:
        response["pagination"] = pagination
        
    return jsonify(response), status_code

def api_error(message, status_code=400, error_code=None):
    """
    Generates a standardized error API response with detailed messages.
    
    :param message: A user-friendly error message.
    :param status_code: The HTTP status code.
    :param error_code: An optional machine-readable error code (e.g., 'INVALID_INPUT').
    :return: A Flask JSON response.
    """
    response = {
        "success": False,
        "error": {
            "message": message
        }
    }
    if error_code:
        response["error"]["code"] = error_code
        
    return jsonify(response), status_code
