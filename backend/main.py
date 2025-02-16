from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
import requests
import os
import logging
from dotenv import load_dotenv
import json
import smtplib
from email.mime.text import MIMEText

# Load environment variables from .env file
load_dotenv()

# Set up logging with detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Initialize Firebase Admin SDK using your service account file
cred = credentials.Certificate("firebase_config.json")
firebase_admin.initialize_app(cred)

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
