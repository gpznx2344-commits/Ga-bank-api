const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Funções para ler e salvar db.json
function readDB() {
    return JSON.parse(fs.readFileSync('db.json', 'utf8'));
}
function writeDB(data) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
}

// Rota: listar contas
app.get('/accounts', (req, res) => {
    const db = readDB();
    res.json(db.accounts);
});

// Rota: criar conta
app.post('/accounts', (req, res) => {
    const { nome, email, cpf, senha } = req.body;
    if(!nome || !email || !cpf || !senha) return res.status(400).json({ error: 'Campos obrigatórios' });
    const db = readDB();
    const newAccount = { id: uuidv4(), nome, email, cpf, senha, saldo:0, chavePix:{} };
    db.accounts.push(newAccount);
    writeDB(db);
    res.json(newAccount);
});

// Rota: enviar PIX
app.post('/pix', (req, res) => {
    const { fromId, toChave, valor } = req.body;
    if(!fromId || !toChave || !valor) return res.status(400).json({ error: 'Campos obrigatórios' });
    
    const db = readDB();
    const remetente = db.accounts.find(a => a.id === fromId);
    const destinatario = db.accounts.find(a => a.chavePix && a.chavePix.valor === toChave);
    
    if(!remetente || !destinatario) return res.status(404).json({ error: 'Conta não encontrada' });
    if(remetente.saldo < valor) return res.status(400).json({ error: 'Saldo insuficiente' });
    
    remetente.saldo -= valor;
    destinatario.saldo += valor;
    
    const transaction = { id: uuidv4(), fromId, toId: destinatario.id, valor, date: new Date().toISOString() };
    db.pixTransactions.push(transaction);
    writeDB(db);
    
    res.json({ success: true, transaction });
});

// Rota: saldo
app.get('/saldo/:id', (req, res) => {
    const db = readDB();
    const account = db.accounts.find(a => a.id === req.params.id);
    if(!account) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json({ saldo: account.saldo });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));