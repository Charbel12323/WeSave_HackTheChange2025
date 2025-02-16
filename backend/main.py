import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
import requests
import logging
import json
import smtplib
from email.mime.text import MIMEText

# Set up logging with detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Initialize Firebase Admin SDK using inline credentials
firebase_creds = {
  "type": "service_account",
  "project_id": "hackthechange2025",
  "private_key_id": "c17a11ee4918e85567eabbf86d750d3f76bfdfb0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDEpZUlLfedt+FQ\nfFQ//aXuX2GWE8PfwQSPuJousgAItOD06t4HOkjX0ZQYIs4Aah8HhQdSOqnSdCz+\n2dC6gmOKVBWhqNAj5zMzVq35KXPZ7tHmH7yCncP0iW7t8XuQXgG40ccEEqVN8Vl7\nmP7n6eNpVlj6/hU0b/kwyv14lCj79n65FBkR8p2SPX/qygVqf1NneNfEA7OQe36Y\nueEmLLSKcOri4cScS2R2ZZGGqmwwg6Z8sXYpCYkF77tuj5WGhenO1uq8/9m2Cr+J\nNU1xSxl6rjQ2VSjWHiTK/tECOSd6ZalquuKgTRV6b7PVueJrXo36F8l/c+hm+dZa\ntndqIu4nAgMBAAECggEAQO9QnbNdJeaXb2VuyKawiVNTvSQPtS5enDrgJvU+T6Gy\n+w0nfgmADkw1c/biQX7JekkyTrPyaf1U8l7orv3pcr8rWXOOL5zj6lsAHdvTVq6m\n/y+RpywDjhdn2wi3vcddGDOlXTHvBhrhao/t9JTmNF2ACnmmdOdYyQTuyEdcdT6u\np22VpeJ3kR97YMkRonWCkLhsJ2c/Qy2R5+84/NTNCzr8y2Jgr25/tQ/9TEPnp5UQ\nM/3ML1ZA3JfjhNNpV6XrDT2hjZy803S6gv+yvwn/oBZAkK0bKAJ9+ILxi+Xv5DsM\nH3V8TwGBgkFC5SE8NuAhgI6NdbbDlxNE61wonpHJQQKBgQDxzWCA/jJ6u1NEUvG7\nqm7y+XGZlo6/EP5N3BkYAVoPKxCoZMgTy8hKPXUsvTQsmKozbOh0vqx/KYjosrtl\nJz+9CRa/sDFcEMF1FnasI+kvZF1S2X65BUNgyZpnoed7z1gDPlrxLPvq/mbxVlKD\nwgP7vqlxJMGODH8lfipa/RinBwKBgQDQMXTov4MUSEmPWpxR5PtX/iJYc+VrzeVx\nHkc57LfvynqgjjjHC1BaSKbtysLABOhwmbpPs2qm3M6KwVSSSIv4zdV5sGFM3umd\nck3yPfvOmDpTZh2j0QY6Ij5VBQysFIlqeejGzLbJRfoBuJ78zrT6lT06seBvykra\nU/PLw7WX4QKBgQDacoeXoY5rMKbmF+UJfMzlN5N4hPsLBEgqgQgulrIM+AQBjaLv\nt2+IGoOsWnYzP+yrrt1G8yeVbimgyC/iD5ZWqkph/MRq/zw3Eoc9tueoiAyDl7gT\nYPzhCOE0dKFTShuiOoggUFp6j0DjEPBU1keQ/EvJysIOGZ4YeiW7s+G8qwKBgQDC\n8wy+RVbAz0/SZM6sAPc61kXi/eN+pzaKTgf0Pa2fZMKfRY31FKsRX6awVIU4uV/O\n0KSdrSvZRDpDw/UlZblsKZIUeQ0jpjirrjU++LuqIPG81oo6s6hZF2e2xRuwpypm\nAfHu9hLTNit9IRv/LrBZVRYYuCephovBFYvc6k5JAQKBgQDZaype/UBsrobI3mke\nwAmKAUaEf9hify2Nu8WZHD2+403RDpUY3xBfUUSVAFuVYjX3sS+h0yyuQrR79HQS\n2gSHRqHuF5uNhiDHzHPOsYxI3o+Nv+HPVIO2ov35KGqaEDtqMU7dfyTCNGLnJhtw\nEoA1wWK0UPrhT7SqeC8Lt9O3jw==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@hackthechange2025.iam.gserviceaccount.com",
  "client_id": "100933937478133964344",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40hackthechange2025.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


cred = credentials.Certificate(firebase_creds)
firebase_admin.initialize_app(cred)

# Initialize Firestore DB
db = firestore.client()

app = Flask(__name__)
CORS(app)

# ----------------------------
# Firebase Authentication Endpoints
# ----------------------------

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    username = data.get("username")

    if not email or not password or not username:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        user = auth.create_user(email=email, password=password)
        db.collection("users").document(user.uid).set({
            "email": email,
            "username": username,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        return jsonify({"message": "User created successfully", "uid": user.uid}), 201
    except Exception as e:
        logging.error(f"Signup error: {str(e)}")
        return jsonify({"error": str(e)}), 400

@app.route("/verify-token", methods=["POST"])
def verify_token():
    data = request.json
    token = data.get("token")
    
    if not token:
        return jsonify({"error": "No token provided"}), 400
        
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]
        user_doc = db.collection("users").document(uid).get()

        if user_doc.exists:
            return jsonify({"message": "Token is valid", "user": user_doc.to_dict()}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        logging.error(f"Token verification error: {str(e)}")
        return jsonify({"error": str(e)}), 401

@app.route("/get-user/<uid>", methods=["GET"])
def get_user(uid):
    try:
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            return jsonify(user_doc.to_dict()), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        logging.error(f"Get user error: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ----------------------------
# Credit Score Tips Endpoint using Google Gemini API
# ----------------------------

@app.route("/credit-tips", methods=["POST"])
def credit_tips():
    """
    Generate credit score improvement tips using the Google Gemini API.
    """
    try:
        logging.info("Received request for credit tips")
        data = request.get_json(silent=True) or {}
        prompt = data.get("prompt", "Provide 5 specific, actionable tips for improving credit score. Format the response in markdown.")
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        gemini_api_url = os.getenv("GEMINI_API_URL", 
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent")
        
        if not gemini_api_key:
            logging.error("Gemini API key not found in environment variables")
            return jsonify({"error": "API key not configured"}), 500

        logging.info(f"Making request to Gemini API at: {gemini_api_url}")
        headers = {"Content-Type": "application/json"}
        full_url = f"{gemini_api_url}?key={gemini_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        response = requests.post(full_url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        logging.info(f"Received response from Gemini API with status: {response.status_code}")
        
        if "candidates" in result and result["candidates"]:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                tips = candidate["content"]["parts"][0]["text"]
            else:
                logging.error(f"Unexpected response structure: {json.dumps(candidate)}")
                return jsonify({"error": "Invalid response format from AI service"}), 500
        else:
            logging.error(f"No candidates in response: {json.dumps(result)}")
            return jsonify({"error": "No response from AI service"}), 500
        
        return jsonify({"tips": tips}), 200
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error calling Gemini API: {str(e)}")
        return jsonify({"error": f"Failed to connect to AI service: {str(e)}"}), 500
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {str(e)}")
        return jsonify({"error": "Invalid response from AI service"}), 500
    except Exception as e:
        logging.error(f"Unexpected error in credit-tips endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# ----------------------------
# Low Income Questionnaire Submission Endpoint
# ----------------------------

@app.route("/submit-low-income", methods=["POST"])
def submit_low_income():
    """
    Stores the low-income user's questionnaire data in Firestore under 'low_income_users'.
    """
    try:
        data = request.json
        email = data.get("email")
        answers = data.get("answers", {})
        uploaded_filename = data.get("uploadedFileName", "")
        
        if not email:
            return jsonify({"error": "Email is required"}), 400

        doc_ref = db.collection("low_income_users").document(email)
        doc_ref.set({
            "email": email,
            "answers": answers,
            "proof_of_payment_file": uploaded_filename,
            "isPaid": False,
            "created_at": firestore.SERVER_TIMESTAMP
        })

        return jsonify({"message": "Low income user data submitted"}), 200
    except Exception as e:
        logging.error(f"Error submitting low income user data: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------------------
# Get Next Low Income User in Queue
# ----------------------------

@app.route("/get-next-low-income-user", methods=["GET"])
def get_next_low_income_user():
    """
    Retrieves the next low-income user in the queue (earliest created_at and not paid).
    Requires a composite index for (isPaid ASC, created_at ASC).
    """
    try:
        users_ref = db.collection("low_income_users")
        
        # Query for users where isPaid == False, ordered by created_at
        query = users_ref.where("isPaid", "==", False).order_by("created_at").limit(1)
        docs = query.stream()

        user_data = None
        for doc in docs:
            user_data = doc.to_dict()
            user_data["id"] = doc.id  # Add Firestore document ID
        
        if user_data:
            logging.info(f"Next low-income user: {user_data}")
            return jsonify(user_data), 200
        else:
            logging.info("No low-income user in queue")
            return jsonify({"error": "No low-income user in queue"}), 404

    except Exception as e:
        logging.error(f"Error in get-next-low-income-user: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------------------
# Donation Endpoint
# ----------------------------

@app.route("/donate", methods=["POST"])
def donate():
    """
    Endpoint for donors to donate to a low-income user.
    Expects:
      - donorEmail: The donor's email
      - recipientEmail: The low-income user's email
      - amount: The donation amount
    Marks the recipient as paid in Firestore and sends a (placeholder) email notification.
    """
    try:
        data = request.json
        donor_email = data.get("donorEmail")
        recipient_email = data.get("recipientEmail")
        amount = data.get("amount", 0)

        if not donor_email or not recipient_email or amount <= 0:
            return jsonify({"error": "Missing donorEmail, recipientEmail, or invalid amount"}), 400

        doc_ref = db.collection("low_income_users").document(recipient_email)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Recipient not found in low_income_users"}), 404
        
        user_data = doc.to_dict()
        if user_data.get("isPaid"):
            return jsonify({"error": "User already marked as paid"}), 400

        # Mark as paid in Firestore
        doc_ref.update({"isPaid": True})

        # (Placeholder) Send an email to the recipient.
        try:
            subject = "Donation Received!"
            body = f"Hello,\n\nYou have received a donation of ${amount} from {donor_email}.\n\nBest,\nFinanceTrack"
            message = MIMEText(body)
            message["Subject"] = subject
            message["From"] = "no-reply@financetrack.com"
            message["To"] = recipient_email

            # Adjust SMTP settings for your environment.
            with smtplib.SMTP("localhost", 1025) as server:
                server.send_message(message)
        except Exception as e:
            logging.warning(f"Email sending failed: {str(e)}")
            # Not fatal—just log the error.

        return jsonify({"message": "Donation successful", "paidUser": recipient_email}), 200

    except Exception as e:
        logging.error(f"Error in /donate: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------------------
# Run the Flask App
# ----------------------------
if __name__ == "__main__":
    logging.info("Starting Flask application...")
    app.run(debug=True)
