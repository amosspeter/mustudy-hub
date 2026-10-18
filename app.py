import os
from datetime import timedelta
from flask import Flask, render_template, request, jsonify, url_for, session, redirect
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from dotenv import load_dotenv
from models import db, User, Subject, Material

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Basic Application Configurations
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mustudy.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1) # 1-hour timeout for logged-in users

# Email Configurations
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

# Initialize Extensions
db.init_app(app)
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Create Database Tables before first request
with app.app_context():
    db.create_all()

# ----------------- HELPER FUNCTIONS -----------------
def send_email(to, subject, template):
    msg = Message(
        subject,
        recipients=[to],
        html=template,
        sender=app.config['MAIL_USERNAME']
    )
    mail.send(msg)

def is_logged_in():
    return 'user_id' in session

# ----------------- FRONTEND ROUTES -----------------
@app.route('/')
def home():
    if is_logged_in():
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if not is_logged_in():
        return redirect(url_for('home'))
        
    # Get the logged-in user from the database
    current_user = User.query.get(session['user_id'])
    
    # Pass the user's name to the HTML template
    return render_template('dashboard.html', current_user=current_user)

# ----------------- AUTHENTICATION API -----------------
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'status': 'error', 'message': 'Email already registered.'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'status': 'error', 'message': 'Username already taken.'}), 400
       
    new_user = User(
        fullname=data['fullname'],
        email=data['email'],
        username=data['username']
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
   
    token = serializer.dumps(new_user.email, salt='email-confirm')
    base_url = os.environ.get('BASE_URL', request.host_url.rstrip('/'))
    confirm_url = f"{base_url}/verify/{token}"
   
    html_content = f"""
    <h2>Welcome to MUSTudy Hub!</h2>
    <p>Hello {new_user.fullname},</p>
    <p>Please click the link below to verify your email address and activate your account:</p>
    <a href="{confirm_url}">Verify My Email</a>
    <p>This link will expire in 1 hour.</p>
    """
    send_email(new_user.email, 'Verify your MUSTudy Hub Account', html_content)
    return jsonify({'status': 'success', 'message': 'Registration successful. Check your email to verify.'}), 201

@app.route('/verify/<token>')
def verify_email(token):
    try:
        email = serializer.loads(token, salt='email-confirm', max_age=3600)
    except SignatureExpired:
        return "The verification link has expired. Please request a new one."
    except BadTimeSignature:
        return "The verification link is invalid."
       
    user = User.query.filter_by(email=email).first_or_404()
    if not user.is_verified:
        user.is_verified = True
        db.session.commit()
    return "Email verified successfully! You can now access your MUSTudy Hub."

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('identifier')
    password = data.get('password')
    
    # 1. Tafuta user kwenye database kwanza
    user = User.query.filter((User.email == identifier) | (User.username == identifier)).first()

    # 2. Hakikisha email/username na password ni sahihi
    if not user or not user.check_password(password):
        return jsonify({'status': 'error', 'message': 'Invalid username/email or password.'}), 401
    
    # 3. Hakikisha amethibitisha email    
    if not user.is_verified:
        return jsonify({'status': 'error', 'message': 'Please verify your email address before logging in.'}), 403

    # 4. Washa ukomo wa muda wa kikao (Session inakatika baada ya saa 1)
    session.permanent = True
    
    # 5. Hifadhi ID ya user na umruhusu kuingia
    session['user_id'] = user.id
    return jsonify({'status': 'success', 'message': 'Login successful!'}), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'status': 'success', 'message': 'Logged out successfully.'}), 200

# ----------------- DASHBOARD API (CRUD) -----------------
@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    if not is_logged_in():
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = session['user_id']
    subjects = Subject.query.filter_by(user_id=user_id).all()
    
    result = []
    for sub in subjects:
        mats = [{'id': m.id, 'title': m.title, 'url': m.url, 'category': m.category} for m in sub.materials]
        result.append({'id': sub.id, 'title': sub.title, 'materials': mats})
        
    return jsonify(result), 200

@app.route('/api/subjects', methods=['POST'])
def create_subject():
    if not is_logged_in():
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    new_subject = Subject(title=data['title'], user_id=session['user_id'])
    db.session.add(new_subject)
    db.session.commit()
    return jsonify({'status': 'success', 'id': new_subject.id}), 201

@app.route('/api/subjects/<int:subject_id>', methods=['PUT', 'DELETE'])
def manage_subject(subject_id):
    if not is_logged_in():
        return jsonify({'error': 'Unauthorized'}), 401
        
    subject = Subject.query.filter_by(id=subject_id, user_id=session['user_id']).first()
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404

    if request.method == 'DELETE':
        db.session.delete(subject)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Subject deleted.'}), 200

    if request.method == 'PUT':
        data = request.json
        subject.title = data['title']
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Subject updated.'}), 200

@app.route('/api/materials', methods=['POST'])
def create_material():
    if not is_logged_in():
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    new_material = Material(
        title=data['title'],
        url=data['url'],
        category=data['category'],
        subject_id=data['subject_id']
    )
    db.session.add(new_material)
    db.session.commit()
    return jsonify({'status': 'success', 'id': new_material.id}), 201

@app.route('/api/materials/<int:material_id>', methods=['PUT', 'DELETE'])
def manage_material(material_id):
    if not is_logged_in():
        return jsonify({'error': 'Unauthorized'}), 401
        
    material = Material.query.get(material_id)
    if not material:
        return jsonify({'error': 'Material not found'}), 404

    # Security check: ensure material belongs to logged in user
    if material.subject.user_id != session['user_id']:
        return jsonify({'error': 'Unauthorized action'}), 403

    if request.method == 'DELETE':
        db.session.delete(material)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Material deleted.'}), 200

    if request.method == 'PUT':
        data = request.json
        material.title = data['title']
        material.url = data['url']
        material.category = data['category']
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Material updated.'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)