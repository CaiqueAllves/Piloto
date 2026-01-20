from flask import Flask, render_template, jsonify, request, session
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)
app.secret_key = 'sua-chave-secreta-aqui'

# CONFIGURAÇÃO DOS PLANOS
PLANS = {
    'beta': {'name': 'BETA', 'create': 5, 'upload': 5, 'users': 1},
    'elite': {'name': 'ELITE', 'create': 15, 'upload': 20, 'users': 2},
    'pro': {'name': 'PRO', 'create': 30, 'upload': 20, 'users': 3},
    'master': {'name': 'MASTER', 'create': 50, 'upload': 30, 'users': 6}
}

# USUÁRIOS DE EXEMPLO (em produção, use banco de dados)
USERS = {
    'userBeta': {
        'id': 'userBeta',
        'password': '123456',
        'plan': 'beta',
        'name': 'Carlos Silva',
        'company': 'Tech Start',
        'role': 'Founder',
        'country': 'Brasil',
        'phone': '(11) 99999-9999',
        'docs_created': 2,
        'docs_uploaded': 1
    },
    'userElite': {
        'id': 'userElite',
        'password': '123456',
        'plan': 'elite',
        'name': 'Ana Souza',
        'company': 'Growth Co.',
        'role': 'CEO',
        'country': 'Brasil',
        'phone': '(21) 98888-8888',
        'docs_created': 8,
        'docs_uploaded': 5
    },
    'userPro': {
        'id': 'userPro',
        'password': '123456',
        'plan': 'pro',
        'name': 'Roberto Lima',
        'company': 'Enterprise BR',
        'role': 'Director',
        'country': 'Brasil',
        'phone': '(31) 97777-7777',
        'docs_created': 20,
        'docs_uploaded': 10
    },
    'userMaster': {
        'id': 'userMaster',
        'password': '123456',
        'plan': 'master',
        'name': 'Mariana Costa',
        'company': 'Corp Global',
        'role': 'CTO',
        'country': 'Brasil',
        'phone': '(41) 96666-6666',
        'docs_created': 35,
        'docs_uploaded': 15
    }
}

# DADOS DE DOCUMENTOS (simulando banco)
DOCUMENTS_FILE = 'documents.json'

def load_documents():
    if os.path.exists(DOCUMENTS_FILE):
        with open(DOCUMENTS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_documents(docs):
    with open(DOCUMENTS_FILE, 'w') as f:
        json.dump(docs, f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user_id = data.get('id')
    password = data.get('password')
    
    if user_id in USERS and USERS[user_id]['password'] == password:
        session['user_id'] = user_id
        return jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'name': USERS[user_id]['name'],
                'plan': USERS[user_id]['plan'],
                'company': USERS[user_id]['company'],
                'role': USERS[user_id]['role'],
                'country': USERS[user_id]['country'],
                'phone': USERS[user_id]['phone'],
                'docs_created': USERS[user_id]['docs_created'],
                'docs_uploaded': USERS[user_id]['docs_uploaded'],
                'plan_limits': PLANS[USERS[user_id]['plan']]
            }
        })
    
    return jsonify({'success': False, 'message': 'ID ou senha inválidos'})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/user/data', methods=['GET'])
def get_user_data():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    user_id = session['user_id']
    user = USERS[user_id]
    docs = load_documents()
    user_docs = [d for d in docs if d['user_id'] == user_id]
    
    return jsonify({
        'user': {
            'id': user_id,
            'name': user['name'],
            'plan': user['plan'],
            'company': user['company'],
            'role': user['role'],
            'country': user['country'],
            'phone': user['phone'],
            'docs_created': user['docs_created'],
            'docs_uploaded': user['docs_uploaded'],
            'plan_limits': PLANS[user['plan']]
        },
        'documents': user_docs
    })

@app.route('/api/document/create', methods=['POST'])
def create_document():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    user_id = session['user_id']
    user = USERS[user_id]
    plan = PLANS[user['plan']]
    
    if user['docs_created'] >= plan['create']:
        return jsonify({'error': f'Limite de criação atingido. Plano {plan["name"]} permite {plan["create"]} documentos.'}), 400
    
    # Atualizar contador
    USERS[user_id]['docs_created'] += 1
    
    # Registrar documento
    docs = load_documents()
    new_doc = {
        'id': str(datetime.now().timestamp()),
        'user_id': user_id,
        'type': 'create',
        'company': user['company'],
        'country': user['country'],
        'phone': user['phone'],
        'value': 'R$ 0,00',
        'date': datetime.now().isoformat(),
        'status': 'Novo'
    }
    docs.append(new_doc)
    save_documents(docs)
    
    return jsonify({
        'success': True,
        'new_count': USERS[user_id]['docs_created'],
        'document': new_doc
    })

@app.route('/api/document/upload', methods=['POST'])
def upload_document():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    user_id = session['user_id']
    user = USERS[user_id]
    plan = PLANS[user['plan']]
    
    if user['docs_uploaded'] >= plan['upload']:
        return jsonify({'error': f'Limite de uploads atingido. Plano {plan["name"]} permite {plan["upload"]} uploads.'}), 400
    
    # Atualizar contador
    USERS[user_id]['docs_uploaded'] += 1
    
    # Registrar documento
    docs = load_documents()
    new_doc = {
        'id': str(datetime.now().timestamp()),
        'user_id': user_id,
        'type': 'upload',
        'company': user['company'],
        'country': user['country'],
        'phone': user['phone'],
        'value': 'R$ 0,00',
        'date': datetime.now().isoformat(),
        'status': 'Upload Manual'
    }
    docs.append(new_doc)
    save_documents(docs)
    
    return jsonify({
        'success': True,
        'new_count': USERS[user_id]['docs_uploaded'],
        'document': new_doc
    })

@app.route('/api/document/<doc_id>/delete', methods=['DELETE'])
def delete_document(doc_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    
    user_id = session['user_id']
    docs = load_documents()
    
    # Encontrar documento
    doc_to_delete = next((d for d in docs if d['id'] == doc_id and d['user_id'] == user_id), None)
    
    if not doc_to_delete:
        return jsonify({'error': 'Documento não encontrado'}), 404
    
    # Remover documento
    docs = [d for d in docs if d['id'] != doc_id]
    save_documents(docs)
    
    # Atualizar contador
    if doc_to_delete['type'] == 'create':
        USERS[user_id]['docs_created'] = max(0, USERS[user_id]['docs_created'] - 1)
    else:
        USERS[user_id]['docs_uploaded'] = max(0, USERS[user_id]['docs_uploaded'] - 1)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)