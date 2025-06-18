from flask import Blueprint, request, jsonify, session
from extensions import db
from models import User, Subject, Assignment, Subtask

routes = Blueprint('routes', __name__)

# ---------------- AUTH ----------------

@routes.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email sudah digunakan'}), 400

    user = User(full_name=full_name, email=email, password=password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Berhasil mendaftar'}), 201

@routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email, password=password).first()
    if not user:
        return jsonify({'error': 'Email atau password salah'}), 401

    session['user_id'] = user.id
    session['user_name'] = user.full_name

    return jsonify({
        'message': 'Login berhasil',
        'name': user.full_name,
        'user_id': user.id
    })

@routes.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout berhasil'})

# ---------------- SUBJECT ----------------

@routes.route('/subjects', methods=['GET'])
def get_subjects():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    subjects = Subject.query.filter_by(user_id=user_id).all()
    return jsonify([{'id': s.id, 'name': s.name, 'color': s.color} for s in subjects])

@routes.route('/subjects', methods=['POST'])
def add_subject():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    name = data.get('name')
    color = data.get('color')
    subject = Subject(name=name, color=color, user_id=user_id)
    db.session.add(subject)
    db.session.commit()
    return jsonify({'message': 'Subject ditambahkan'})

@routes.route('/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    subject = Subject.query.get(subject_id)
    if not subject or subject.user_id != user_id:
        return jsonify({'error': 'Subject tidak ditemukan'}), 404

    assignments = Assignment.query.filter_by(subject_id=subject_id).all()
    for a in assignments:
        Subtask.query.filter_by(assignment_id=a.id).delete()
        db.session.delete(a)

    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject dihapus'})

# ---------------- ASSIGNMENT ----------------

@routes.route('/assignments/<int:subject_id>', methods=['GET'])
def get_assignments(subject_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    subject = Subject.query.get(subject_id)
    if not subject or subject.user_id != user_id:
        return jsonify({'error': 'Subject tidak ditemukan'}), 404

    assignments = Assignment.query.filter_by(subject_id=subject_id).all()
    return jsonify([{
        'id': a.id,
        'name': a.name,
        'deadline': a.deadline
    } for a in assignments])

@routes.route('/assignments/<int:subject_id>', methods=['POST'])
def add_assignment(subject_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    name = data.get('name')
    deadline = data.get('deadline')

    subject = Subject.query.get(subject_id)
    if not subject or subject.user_id != user_id:
        return jsonify({'error': 'Subject tidak ditemukan'}), 404

    assignment = Assignment(name=name, deadline=deadline, subject_id=subject_id)
    db.session.add(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment ditambahkan'})

@routes.route('/assignments/<int:assignment_id>', methods=['PUT'])
def rename_assignment(assignment_id):
    data = request.get_json()
    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'Nama tidak boleh kosong'}), 400

    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment tidak ditemukan'}), 404

    assignment.name = new_name
    db.session.commit()
    return jsonify({'message': 'Assignment berhasil diubah'})

@routes.route('/assignments/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment tidak ditemukan'}), 404

    Subtask.query.filter_by(assignment_id=assignment_id).delete()
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment berhasil dihapus'})

# ---------------- SUBTASKS ----------------

@routes.route('/subtasks/<int:assignment_id>', methods=['GET'])
def get_subtasks(assignment_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    assignment = Assignment.query.get(assignment_id)
    if not assignment or assignment.subject.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    subtasks = Subtask.query.filter_by(assignment_id=assignment_id).all()
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'is_checked': s.is_checked
    } for s in subtasks])

@routes.route('/subtasks/<int:assignment_id>', methods=['POST'])
def add_subtask(assignment_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    assignment = Assignment.query.get(assignment_id)
    if not assignment or assignment.subject.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Nama subtask tidak boleh kosong'}), 400

    subtask = Subtask(name=name, assignment_id=assignment_id)
    db.session.add(subtask)
    db.session.commit()
    return jsonify({'message': 'Subtask ditambahkan'})

@routes.route('/subtasks/<int:subtask_id>', methods=['PUT'])
def update_subtask(subtask_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    subtask = Subtask.query.get(subtask_id)
    if not subtask or subtask.assignment.subject.user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    is_checked = data.get('is_checked')
    subtask.is_checked = is_checked
    db.session.commit()
    return jsonify({'message': 'Subtask diupdate'})
