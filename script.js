// CONFIGURAÇÃO
const GOOGLE_FORMS = {
    create: 'https://docs.google.com/forms/d/e/SEU_FORM_ID/viewform',
    manualUpload: 'https://docs.google.com/forms/d/e/SEU_FORM_ID2/viewform'
};

let currentUser = null;
let documents = [];

// ELEMENTOS DOM
const loginScreen = document.getElementById('loginScreen');
const homeScreen = document.getElementById('homeScreen');
const userScreen = document.getElementById('userScreen');
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const uploadModal = document.getElementById('uploadModal');

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 60000);
    checkAuth();
});

// FUNÇÕES DE DATA
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('pt-BR', options);
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    
    const dateInfo = document.getElementById('dateInfo');
    if (dateInfo) {
        dateInfo.textContent = `${capitalized} | ${timeStr}`;
    }
}

// AUTENTICAÇÃO
async function checkAuth() {
    try {
        const response = await fetch('/api/user/data');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            documents = data.documents;
            showScreen('homeScreen');
            loadUserData();
        } else {
            showScreen('loginScreen');
        }
    } catch (error) {
        console.error('Erro na autenticação:', error);
        showScreen('loginScreen');
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            documents = [];
            showScreen('homeScreen');
            loadUserData();
            errorMsg.textContent = '';
            loginForm.reset();
        } else {
            errorMsg.textContent = data.message;
        }
    } catch (error) {
        errorMsg.textContent = 'Erro ao conectar com o servidor';
    }
});

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    
    currentUser = null;
    documents = [];
    showScreen('loginScreen');
}

// NAVEGAÇÃO
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showHomeScreen() {
    showScreen('homeScreen');
}

function showUserScreen() {
    showScreen('userScreen');
    loadUserData();
}

// CARREGAR DADOS DO USUÁRIO
function loadUserData() {
    if (!currentUser) return;
    
    // Atualizar header
    const planBadge = document.getElementById('userPlan');
    planBadge.textContent = currentUser.plan.toUpperCase();
    planBadge.className = `plan-badge plan-${currentUser.plan}`;
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('welcomeTitle').textContent = `Bem-vindo, ${currentUser.name.split(' ')[0]}!`;
    
    // Atualizar estatísticas
    const plan = currentUser.plan_limits;
    document.getElementById('currentPlan').textContent = plan.name;
    document.getElementById('planLimits').textContent = `${plan.create} criados + ${plan.upload} uploads`;
    document.getElementById('maxCreate').textContent = plan.create;
    document.getElementById('maxUpload').textContent = plan.upload;
    
    document.getElementById('docsCreated').textContent = currentUser.docs_created;
    document.getElementById('docsUploaded').textContent = currentUser.docs_uploaded;
    
    // Atualizar barras de progresso
    const createProgress = (currentUser.docs_created / plan.create) * 100;
    const uploadProgress = (currentUser.docs_uploaded / plan.upload) * 100;
    
    document.getElementById('createProgress').style.width = `${Math.min(100, createProgress)}%`;
    document.getElementById('uploadProgress').style.width = `${Math.min(100, uploadProgress)}%`;
    
    // Atualizar tela do usuário
    document.getElementById('infoName').textContent = currentUser.name;
    document.getElementById('infoCompany').textContent = currentUser.company;
    document.getElementById('infoRole').textContent = currentUser.role;
    document.getElementById('infoCountry').textContent = currentUser.country;
    document.getElementById('infoPhone').textContent = currentUser.phone;
    
    // Carregar documentos
    loadDocuments();
}

async function loadDocuments() {
    try {
        const response = await fetch('/api/user/data');
        if (response.ok) {
            const data = await response.json();
            documents = data.documents;
            renderDocumentsList();
        }
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
    }
}

// FUNÇÕES DOS BOTÕES
async function createDocument() {
    const plan = currentUser.plan_limits;
    
    if (currentUser.docs_created >= plan.create) {
        alert(`Limite de documentos criados atingido! Seu plano ${plan.name} permite criar até ${plan.create} documentos.`);
        return;
    }
    
    try {
        const response = await fetch('/api/document/create', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            currentUser.docs_created = data.new_count;
            documents.push(data.document);
            loadUserData();
            window.open(GOOGLE_FORMS.create, '_blank');
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao criar documento');
    }
}

function uploadDocument() {
    const plan = currentUser.plan_limits;
    
    if (currentUser.docs_uploaded >= plan.upload) {
        alert(`Limite de uploads atingido! Seu plano ${plan.name} permite até ${plan.upload} uploads.`);
        return;
    }
    
    uploadModal.classList.add('active');
}

function closeUploadModal() {
    uploadModal.classList.remove('active');
}

async function selectUploadType(type) {
    closeUploadModal();
    
    switch(type) {
        case 'google':
            alert('Upload por planilha Google selecionado. Funcionalidade em desenvolvimento.');
            break;
        case 'excel':
            alert('Upload por Excel selecionado. Funcionalidade em desenvolvimento.');
            break;
        case 'word':
            alert('Upload por Word selecionado. Funcionalidade em desenvolvimento.');
            break;
        case 'manual':
            window.open(GOOGLE_FORMS.manualUpload, '_blank');
            
            try {
                const response = await fetch('/api/document/upload', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    currentUser.docs_uploaded = data.new_count;
                    documents.push(data.document);
                    loadUserData();
                } else {
                    alert(data.error);
                }
            } catch (error) {
                alert('Erro ao registrar upload');
            }
            break;
    }
}

function renderDocumentsList() {
    const listContainer = document.getElementById('documentsList');
    const docCount = document.getElementById('docCount');
    
    if (documents.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">Nenhum documento encontrado. Crie seu primeiro documento!</p>';
        docCount.textContent = '(0)';
        return;
    }
    
    docCount.textContent = `(${documents.length})`;
    
    const docsHTML = documents.map(doc => `
        <div class="document-item">
            <div class="doc-icon">${doc.type === 'create' ? '📄' : '📤'}</div>
            <div class="doc-info">
                <div class="doc-title">Documento #${doc.id.slice(-4)}</div>
                <div class="doc-meta">
                    Empresa: ${doc.company} | 
                    País: ${doc.country} | 
                    Tel: ${doc.phone} | 
                    Data: ${new Date(doc.date).toLocaleDateString('pt-BR')} | 
                    Valor: ${doc.value}
                </div>
            </div>
            <div class="doc-actions">
                <button class="doc-btn view" onclick="viewDocument('${doc.id}')" title="Visualizar">👁️</button>
                <button class="doc-btn delete" onclick="deleteDocument('${doc.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = docsHTML;
}

function viewDocument(id) {
    const doc = documents.find(d => d.id === id);
    if (doc) {
        alert(`Visualizando documento #${id.slice(-4)}\n\nEmpresa: ${doc.company}\nPaís: ${doc.country}\nTelefone: ${doc.phone}\nData: ${new Date(doc.date).toLocaleDateString('pt-BR')}\nValor: ${doc.value}\nStatus: ${doc.status}`);
    }
}

async function deleteDocument(id) {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    
    try {
        const response = await fetch(`/api/document/${id}/delete`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            documents = documents.filter(d => d.id !== id);
            currentUser.docs_created = Math.max(0, currentUser.docs_created - 1);
            renderDocumentsList();
            loadUserData();
        }
    } catch (error) {
        alert('Erro ao excluir documento');
    }
}

function showUpgrade() {
    alert('Funcionalidade de upgrade em desenvolvimento.\n\nPara mais informações, entre em contato com nosso suporte.');
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
}

// Fechar modal clicando fora
window.onclick = function(event) {
    if (event.target === uploadModal) {
        closeUploadModal();
    }
}